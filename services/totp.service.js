const crypto = require('node:crypto')

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const period = 30

function base32(bytes) {
    let buffer = 0
    let bits = 0
    let result = ''
    for (const byte of bytes) {
        buffer = (buffer << 8) | byte
        bits += 8
        while (bits >= 5) {
            bits -= 5
            result += alphabet[(buffer >>> bits) & 31]
        }
    }
    if (bits) result += alphabet[(buffer << (5 - bits)) & 31]
    return result
}

function codeAt(secret, counter) {
    const message = Buffer.alloc(8)
    message.writeBigUInt64BE(BigInt(counter))
    const hmac = crypto.createHmac('sha1', secret).update(message).digest()
    const offset = hmac[hmac.length - 1] & 15
    const value = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000
    return String(value).padStart(6, '0')
}

function matchingStep(secret, code, lastStep, now = Date.now()) {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return null
    const step = Math.floor(now / 1000 / period)
    for (const candidate of [step, step - 1, step + 1]) {
        if (candidate < 0 || candidate <= lastStep) continue
        if (crypto.timingSafeEqual(Buffer.from(codeAt(secret, candidate)), Buffer.from(code))) {
            return candidate
        }
    }
    return null
}

function key() {
    const value = process.env.AUTH_TOTP_KEY || ''
    if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error('Configure AUTH_TOTP_KEY con 32 bytes en hexadecimal.')
    return Buffer.from(value, 'hex')
}

function encrypt(secret, userId) {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
    cipher.setAAD(Buffer.from(userId))
    const encrypted = Buffer.concat([cipher.update(secret), cipher.final()])
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
}

function decrypt(value, userId) {
    const bytes = Buffer.from(value, 'base64url')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12))
    decipher.setAAD(Buffer.from(userId))
    decipher.setAuthTag(bytes.subarray(12, 28))
    return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()])
}

module.exports = { base32, matchingStep, encrypt, decrypt }
