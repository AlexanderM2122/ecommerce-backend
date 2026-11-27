const bcrypt = require('bcrypt')
const crypto = require('node:crypto')
const { usuario, rol, sequelize } = require('../models')
const { GeneraToken, TiempoRestanteToken } = require('../services/jwttoken.service')
const { BCRYPT_SALT_ROUNDS, validarEmail, validarNombre, validarPasswordFuerte } = require('../services/usuario.rules')
const validarCampos = require('../middlewares/validarCampos.middleware')
const mail = require('../services/auth-mail.service')
const totp = require('../services/totp.service')
const { clearLoginLimit } = require('../middlewares/auth-rate.middleware')

const auth = {}
const dummyHash = bcrypt.hash(crypto.randomBytes(32).toString('hex'), BCRYPT_SALT_ROUNDS)
const minute = 60_000
const invalidCode = 'El c?digo es inv?lido, venci? o agot? sus intentos.'
const codeTtl = 10 * minute
const maxCodeAttempts = 5
const emailResponse = 'Si la cuenta cumple los requisitos, recibir?s un correo con el c?digo.'
const incorrect = 'Usuario o contrase?a incorrectos.'
const purposes = {
    verify: { hash: 'verificacionHash', expiry: 'verificacionVence', attempts: 'verificacionIntentos' },
    reset: { hash: 'recuperacionHash', expiry: 'recuperacionVence', attempts: 'recuperacionIntentos' }
}

function fail(status, message) {
    return Object.assign(new Error(message), { statusCode: status })
}

function randomToken() {
    return crypto.randomBytes(32).toString('base64url')
}

function hash(value) {
    return crypto.createHash('sha256').update(value).digest('hex')
}

function tokenHash(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw fail(410, 'La autorizaci?n para cambiar la contrase?a venci?. Solicita otro c?digo.')
    return hash('password-grant:' + value)
}

function passwordInput(value) {
    return typeof value === 'string' && value.length > 0 && Buffer.byteLength(value, 'utf8') <= 72
}

function locked(where, operation) {
    return sequelize.transaction(async transaction => {
        const account = await usuario.findOne({ where, transaction, lock: transaction.LOCK.UPDATE })
        return operation(account, transaction)
    })
}

function clearChallenge(account) {
    account.mfaRetoHash = null
    account.mfaRetoVence = null
    account.mfaRetoIntentos = null
}

function tokenFor(account, role) {
    return {
        email: account.email,
        nombre: account.nombre,
        rol: role,
        jwt: GeneraToken(account.email, account.nombre, role, account.authVersion)
    }
}

async function completeLogin(req, res, account, role) {
    await req.bitacora('usuario.login', account.email)
    clearLoginLimit(account.email)
    res.json(tokenFor(account, role))
}

function codeHash(account, purpose, code) {
    return crypto.createHmac('sha256', process.env.JWT_SECRET)
        .update(JSON.stringify(['auth-email-code', account.id, purpose, code]))
        .digest('hex')
}

async function deliverCode(email, purpose) {
    const fields = purposes[purpose]
    const recipient = await locked({ email }, async (account, transaction) => {
        if (!account || Boolean(account.correoVerificadoEn) === (purpose === 'verify')) return null
        const timeLeft = (account[fields.expiry]?.getTime() || 0) - Date.now()
        if (timeLeft > codeTtl - minute && timeLeft <= codeTtl) return null

        let code, digest
        do {
            code = String(crypto.randomInt(1000000)).padStart(6, '0')
            digest = codeHash(account, purpose, code)
        } while (digest === account[fields.hash])
        account[fields.hash] = digest
        account[fields.expiry] = new Date(Date.now() + codeTtl)
        account[fields.attempts] = 0
        await account.save({ transaction })
        return { email: account.email, digest, code }
    })
    if (!recipient) return
    try {
        await mail.sendAuthCode(recipient.email, purpose, recipient.code)
    } catch (error) {
        await usuario.update({ [fields.hash]: null, [fields.expiry]: null, [fields.attempts]: null }, {
            where: { email: recipient.email, [fields.hash]: recipient.digest }
        })
        throw error
    }
}

function queueCode(email, purpose) {
    // La respuesta p?blica no revela si existe una cuenta que pueda recibir el c?digo.
    setImmediate(() => {
        deliverCode(email, purpose).catch(error => {
            console.error('Error al enviar un correo de autenticaci?n:', error.name)
        })
    })
}

async function verifyEmailCode(email, code, purpose) {
    if (typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) throw fail(400, invalidCode)
    const fields = purposes[purpose]
    const verified = await locked({ email }, async (account, transaction) => {
        if (!account || Boolean(account.correoVerificadoEn) === (purpose === 'verify') ||
            !account[fields.hash] || account[fields.expiry] <= new Date() ||
            account[fields.attempts] == null || account[fields.attempts] >= maxCodeAttempts) return null

        const expected = Buffer.from(account[fields.hash], 'hex')
        const candidate = Buffer.from(codeHash(account, purpose, code), 'hex')
        if (!crypto.timingSafeEqual(expected, candidate)) {
            account[fields.attempts]++
            await account.save({ transaction })
            return null
        }

        if (purpose === 'verify') {
            account.correoVerificadoEn = new Date()
            account[fields.hash] = null
            account[fields.expiry] = null
            account[fields.attempts] = null
            await account.save({ transaction })
            return {}
        }

        const token = randomToken()
        account[fields.hash] = tokenHash(token)
        account[fields.expiry] = new Date(Date.now() + codeTtl)
        account[fields.attempts] = maxCodeAttempts
        await account.save({ transaction })
        return { token }
    })
    if (!verified) throw fail(400, invalidCode)
    return verified
}

auth.registroValidator = [validarEmail, validarNombre, validarPasswordFuerte, validarCampos]
auth.emailValidator = [validarEmail, validarCampos]
auth.passwordValidator = [validarPasswordFuerte, validarCampos]

auth.login = async function (req, res) {
    const { email, password } = req.body || {}
    if (typeof email !== 'string' || !email.trim() || email.length > 254 || !passwordInput(password)) {
        throw fail(400, 'Debe proporcionar un correo y una contrase?a v?lidos.')
    }

    const found = await usuario.findOne({ where: { email: email.trim().toLowerCase() }, attributes: ['id', 'passwordhash'] })
    const matches = await bcrypt.compare(password, found?.passwordhash || await dummyHash)
    if (!found || !matches) throw fail(401, incorrect)

    const result = await locked({ id: found.id }, async (account, transaction) => {
        if (!account || account.passwordhash !== found.passwordhash) throw fail(401, incorrect)
        if (!account.correoVerificadoEn) return { emailPendiente: account.email }

        if (account.mfaSecreto) {
            const reto = randomToken()
            account.mfaRetoHash = hash(reto)
            account.mfaRetoVence = new Date(Date.now() + 5 * minute)
            account.mfaRetoIntentos = 0
            await account.save({ transaction })
            return { reto }
        }

        const accountRole = await rol.findByPk(account.rolid, { transaction })
        return { account, role: accountRole.nombre }
    })

    if (result.emailPendiente) {
        clearLoginLimit(result.emailPendiente)
        return res.status(403).json({ codigo: 'correo_pendiente', email: result.emailPendiente })
    }
    if (result.reto) return res.status(202).json({ reto: result.reto })
    return completeLogin(req, res, result.account, result.role)
}

auth.registro = async function (req, res) {
    const { email, password, nombre } = req.body
    mail.configuration()
    const accountRole = await rol.findOne({ where: { nombre: 'Usuario' }, attributes: ['id'] })
    if (!accountRole) throw fail(500, 'Error de configuraci?n de roles en el servidor.')

    const account = await usuario.create({
        id: crypto.randomUUID(), email, nombre, rolid: accountRole.id, protegido: false,
        passwordhash: await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
    })
    queueCode(account.email, 'verify')
    await req.bitacora('usuario.registro', account.email)
    res.status(201).json({ id: account.id, email, nombre, rol: 'Usuario' })
}

function requestCode(purpose) {
    return (req, res) => {
        mail.configuration()
        queueCode(req.body.email, purpose)
        res.status(202).json({ mensaje: emailResponse })
    }
}

auth.reenviar = requestCode('verify')
auth.recuperar = requestCode('reset')

auth.verificar = async function (req, res) {
    await verifyEmailCode(req.body.email, req.body.codigo, 'verify')
    res.sendStatus(204)
}

auth.verificarRecuperacion = async function (req, res) {
    res.json(await verifyEmailCode(req.body.email, req.body.codigo, 'reset'))
}

function resetPasswordState(account, hashPassword) {
    account.passwordhash = hashPassword
    account.authVersion = crypto.randomUUID()
    account.recuperacionHash = null
    account.recuperacionVence = null
    account.recuperacionIntentos = null
    account.mfaPendiente = null
    account.mfaPendienteVence = null
    clearChallenge(account)
}

auth.restablecer = async function (req, res) {
    const digest = tokenHash(req.body?.token)
    const hashPassword = await bcrypt.hash(req.body.password, BCRYPT_SALT_ROUNDS)
    await locked({ recuperacionHash: digest }, async (account, transaction) => {
        if (!account || account.recuperacionVence <= new Date()) {
            throw fail(410, 'La autorizaci?n para cambiar la contrase?a venci?. Solicita otro c?digo.')
        }
        resetPasswordState(account, hashPassword)
        await account.save({ transaction })
    })
    res.sendStatus(204)
}

function consumeFactor(account, code) {
    const step = totp.matchingStep(totp.decrypt(account.mfaSecreto, account.id), code, account.mfaUltimoPaso)
    if (step !== null) {
        account.mfaUltimoPaso = step
        return true
    }
    if (typeof code !== 'string' || !/^[a-f0-9]{16}$/i.test(code)) return false
    const digest = hash(code.toLowerCase())
    const recoveryCodes = account.mfaRecuperacion || []
    if (!recoveryCodes.includes(digest)) return false
    account.mfaRecuperacion = recoveryCodes.filter(value => value !== digest)
    return true
}

auth.segundoFactor = async function (req, res) {
    const { reto, codigo } = req.body || {}
    if (typeof reto !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(reto)) {
        throw fail(401, 'El intento de inicio de sesi?n venci?. Vuelve a ingresar.')
    }

    const result = await locked({ mfaRetoHash: hash(reto) }, async (account, transaction) => {
        if (!account?.mfaSecreto || !account.correoVerificadoEn || account.mfaRetoVence <= new Date()) return null
        if (!consumeFactor(account, codigo)) {
            account.mfaRetoIntentos++
            const exhausted = account.mfaRetoIntentos >= 5
            if (exhausted) clearChallenge(account)
            await account.save({ transaction })
            return { exhausted }
        }

        clearChallenge(account)
        await account.save({ transaction })
        const accountRole = await rol.findByPk(account.rolid, { transaction })
        return { account, role: accountRole.nombre }
    })

    if (!result || result.exhausted) {
        throw fail(401, 'El intento de inicio de sesi?n venci? o agot? sus intentos. Vuelve a ingresar.')
    }
    if (!result.account) throw fail(400, 'El c?digo es inv?lido o ya fue utilizado.')
    return completeLogin(req, res, result.account, result.role)
}

function withCurrentAccount(req, operation) {
    return locked({ id: req.authAccount.id }, (account, transaction) => {
        if (!account || account.authVersion !== req.authAccount.authVersion || !account.correoVerificadoEn) {
            throw fail(401, 'La sesi?n venci?. Vuelve a ingresar.')
        }
        return operation(account, transaction)
    })
}

async function checkPassword(account, password) {
    if (!passwordInput(password) || !await bcrypt.compare(password, account.passwordhash)) {
        throw fail(400, 'La contrase?a actual es incorrecta.')
    }
}

auth.cambiarPassword = async function (req, res) {
    const { passwordActual, password } = req.body
    await withCurrentAccount(req, async (account, transaction) => {
        await checkPassword(account, passwordActual)
        if (password === passwordActual) throw fail(400, 'La contrase�a nueva debe ser distinta de la actual.')

        resetPasswordState(account, await bcrypt.hash(password, BCRYPT_SALT_ROUNDS))
        await account.save({ transaction })
        await req.bitacora('usuario.cambiarPassword', account.id, { transaction })
    })
    res.sendStatus(204)
}

auth.estadoMfa = (req, res) => {
    res.json({ activo: Boolean(req.authAccount.mfaSecreto) })
}

auth.prepararMfa = async function (req, res) {
    const secret = await withCurrentAccount(req, async (account, transaction) => {
        if (account.mfaSecreto) throw fail(409, 'La autenticaci?n multifactor ya est? activa.')
        await checkPassword(account, req.body?.password)

        const secret = crypto.randomBytes(20)
        account.mfaPendiente = totp.encrypt(secret, account.id)
        account.mfaPendienteVence = new Date(Date.now() + 10 * minute)
        await account.save({ transaction })
        return totp.base32(secret)
    })
    res.json({ secreto: secret })
}

auth.activarMfa = async function (req, res) {
    const result = await withCurrentAccount(req, async (account, transaction) => {
        if (!account.mfaPendiente || account.mfaPendienteVence <= new Date()) {
            throw fail(400, 'La configuraci?n venci?. Genera una clave nueva.')
        }
        const secret = totp.decrypt(account.mfaPendiente, account.id)
        const step = totp.matchingStep(secret, req.body?.codigo, null)
        if (step === null) throw fail(400, 'El c?digo de la app autenticadora es inv?lido.')

        const codes = Array.from({ length: 8 }, () => crypto.randomBytes(8).toString('hex'))
        account.mfaSecreto = account.mfaPendiente
        account.mfaUltimoPaso = step
        account.mfaRecuperacion = codes.map(hash)
        account.mfaPendiente = null
        account.mfaPendienteVence = null
        account.authVersion = crypto.randomUUID()
        await account.save({ transaction })
        const accountRole = await rol.findByPk(account.rolid, { transaction })
        return { codigos: codes, jwt: tokenFor(account, accountRole.nombre).jwt }
    })
    res.json(result)
}

auth.desactivarMfa = async function (req, res) {
    const result = await withCurrentAccount(req, async (account, transaction) => {
        if (!account.mfaSecreto) throw fail(409, 'La autenticaci?n multifactor ya est? desactivada.')
        await checkPassword(account, req.body?.password)
        if (!consumeFactor(account, req.body?.codigo)) throw fail(400, 'El c?digo es inv?lido o ya fue utilizado.')

        account.mfaSecreto = null
        account.mfaUltimoPaso = null
        account.mfaRecuperacion = null
        account.authVersion = crypto.randomUUID()
        clearChallenge(account)
        await account.save({ transaction })
        const accountRole = await rol.findByPk(account.rolid, { transaction })
        return { jwt: tokenFor(account, accountRole.nombre).jwt }
    })
    res.json(result)
}

auth.tiempo = function (req, res) {
    const tiempo = TiempoRestanteToken(req)
    if (tiempo === null) return res.sendStatus(401)
    res.send(tiempo)
}

module.exports = auth
