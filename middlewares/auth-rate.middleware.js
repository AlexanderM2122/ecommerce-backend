const crypto = require('node:crypto')

const windowMs = 15 * 60_000
const maxKeys = 50_000
const buckets = new Map()

const cleanup = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
        if (bucket.expires <= now) buckets.delete(key)
    }
}, 60_000)
cleanup.unref()

function consume(key, maximum, now) {
    let bucket = buckets.get(key)
    if (bucket && bucket.expires <= now) {
        buckets.delete(key)
        bucket = null
    }
    if (!bucket) {
        if (buckets.size >= maxKeys) return 60
        bucket = { count: 0, expires: now + windowMs }
        buckets.set(key, bucket)
    }
    if (bucket.count >= maximum) return Math.ceil((bucket.expires - now) / 1000)
    bucket.count++
    return 0
}

function accountKey(scope, email) {
    // La colación de MySQL también puede considerar iguales distintos acentos.
    const normalized = email.trim().normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    const hash = crypto.createHash('sha256').update(normalized).digest('hex')
    return scope + ':email:' + hash
}

function limit(scope, ipMaximum, emailMaximum) {
    return (req, res, next) => {
        const now = Date.now()
        const ip = req.ip || 'unknown'
        let retry = consume(scope + ':ip:' + ip, ipMaximum, now)
        const email = req.authAccount?.email || req.body?.email
        if (!retry && emailMaximum && typeof email === 'string' && email.length <= 254 && email.trim()) {
            retry = consume(accountKey(scope, email), emailMaximum, now)
        }
        if (!retry) return next()
        res.set('Retry-After', String(retry))
        return res.status(429).json({ mensaje: 'Demasiados intentos. Inténtalo más tarde.' })
    }
}

module.exports = limit
module.exports.clearLoginLimit = email => buckets.delete(accountKey('login', email))
