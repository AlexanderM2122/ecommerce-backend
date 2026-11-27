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
const invalidLink = 'El enlace es inválido, venció o ya fue utilizado.'
const emailResponse = 'Si la cuenta cumple los requisitos, recibirás un correo con el enlace.'
const incorrect = 'Usuario o contraseña incorrectos.'
const purposes = {
    verify: { hash: 'verificacionHash', expiry: 'verificacionVence', ttl: 24 * 60 * minute },
    reset: { hash: 'recuperacionHash', expiry: 'recuperacionVence', ttl: 30 * minute }
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
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw fail(400, invalidLink)
    return hash(value)
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

async function deliverLink(email, purpose) {
    const fields = purposes[purpose]
    const token = randomToken()
    const recipient = await locked({ email }, async (account, transaction) => {
        if (!account || Boolean(account.correoVerificadoEn) === (purpose === 'verify')) return null
        // Conserva el enlace durante un minuto para evitar envíos duplicados.
        if (account[fields.expiry]?.getTime() > Date.now() + fields.ttl - minute) return null
        account[fields.hash] = hash(token)
        account[fields.expiry] = new Date(Date.now() + fields.ttl)
        await account.save({ transaction })
        return account.email
    })
    if (!recipient) return
    try {
        await mail.sendAuthLink(recipient, purpose, token)
    } catch (error) {
        await usuario.update({ [fields.hash]: null, [fields.expiry]: null }, {
            where: { email: recipient, [fields.hash]: hash(token) }
        })
        throw error
    }
}

function queueLink(email, purpose) {
    // Responde antes de consultar la cuenta o contactar al proveedor.
    setImmediate(() => {
        deliverLink(email, purpose).catch(error => {
            console.error('Error al enviar un correo de autenticación:', error.name)
        })
    })
}

auth.registroValidator = [validarEmail, validarNombre, validarPasswordFuerte, validarCampos]
auth.emailValidator = [validarEmail, validarCampos]
auth.passwordValidator = [validarPasswordFuerte, validarCampos]

auth.login = async function (req, res) {
    const { email, password } = req.body || {}
    if (typeof email !== 'string' || !email.trim() || email.length > 254 || !passwordInput(password)) {
        throw fail(400, 'Debe proporcionar un correo y una contraseña válidos.')
    }

    const found = await usuario.findOne({ where: { email: email.trim().toLowerCase() }, attributes: ['id', 'passwordhash'] })
    const matches = await bcrypt.compare(password, found?.passwordhash || await dummyHash)
    if (!found || !matches) throw fail(401, incorrect)

    const result = await locked({ id: found.id }, async (account, transaction) => {
        if (!account || account.passwordhash !== found.passwordhash) throw fail(401, incorrect)
        if (!account.correoVerificadoEn) throw fail(403, 'Verifica tu correo antes de iniciar sesión.')

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

    if (result.reto) return res.status(202).json({ reto: result.reto })
    return completeLogin(req, res, result.account, result.role)
}

auth.registro = async function (req, res) {
    const { email, password, nombre } = req.body
    mail.configuration()
    const accountRole = await rol.findOne({ where: { nombre: 'Usuario' }, attributes: ['id'] })
    if (!accountRole) throw fail(500, 'Error de configuración de roles en el servidor.')

    const account = await usuario.create({
        id: crypto.randomUUID(), email, nombre, rolid: accountRole.id, protegido: false,
        passwordhash: await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
    })
    queueLink(account.email, 'verify')
    await req.bitacora('usuario.registro', account.email)
    res.status(201).json({ id: account.id, email, nombre, rol: 'Usuario' })
}

function requestLink(purpose) {
    return (req, res) => {
        mail.configuration()
        queueLink(req.body.email, purpose)
        res.status(202).json({ mensaje: emailResponse })
    }
}

auth.reenviar = requestLink('verify')
auth.recuperar = requestLink('reset')

auth.verificar = async function (req, res) {
    const digest = tokenHash(req.body?.token)
    await locked({ verificacionHash: digest }, async (account, transaction) => {
        if (!account || account.verificacionVence <= new Date()) throw fail(400, invalidLink)
        account.correoVerificadoEn = new Date()
        account.verificacionHash = null
        account.verificacionVence = null
        await account.save({ transaction })
    })
    res.sendStatus(204)
}

auth.restablecer = async function (req, res) {
    const digest = tokenHash(req.body?.token)
    const hashPassword = await bcrypt.hash(req.body.password, BCRYPT_SALT_ROUNDS)
    await locked({ recuperacionHash: digest }, async (account, transaction) => {
        if (!account || account.recuperacionVence <= new Date()) throw fail(400, invalidLink)
        account.passwordhash = hashPassword
        account.authVersion = crypto.randomUUID()
        account.recuperacionHash = null
        account.recuperacionVence = null
        account.mfaPendiente = null
        account.mfaPendienteVence = null
        clearChallenge(account)
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
        throw fail(401, 'El intento de inicio de sesión venció. Vuelve a ingresar.')
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
        throw fail(401, 'El intento de inicio de sesión venció o agotó sus intentos. Vuelve a ingresar.')
    }
    if (!result.account) throw fail(400, 'El código es inválido o ya fue utilizado.')
    return completeLogin(req, res, result.account, result.role)
}

function withCurrentAccount(req, operation) {
    return locked({ id: req.authAccount.id }, (account, transaction) => {
        if (!account || account.authVersion !== req.authAccount.authVersion || !account.correoVerificadoEn) {
            throw fail(401, 'La sesión venció. Vuelve a ingresar.')
        }
        return operation(account, transaction)
    })
}

async function checkPassword(account, password) {
    if (!passwordInput(password) || !await bcrypt.compare(password, account.passwordhash)) {
        throw fail(400, 'La contraseña actual es incorrecta.')
    }
}

auth.estadoMfa = (req, res) => {
    res.json({ activo: Boolean(req.authAccount.mfaSecreto) })
}

auth.prepararMfa = async function (req, res) {
    const secret = await withCurrentAccount(req, async (account, transaction) => {
        if (account.mfaSecreto) throw fail(409, 'La autenticación multifactor ya está activa.')
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
            throw fail(400, 'La configuración venció. Genera una clave nueva.')
        }
        const secret = totp.decrypt(account.mfaPendiente, account.id)
        const step = totp.matchingStep(secret, req.body?.codigo, null)
        if (step === null) throw fail(400, 'El código de la app autenticadora es inválido.')

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
        if (!account.mfaSecreto) throw fail(409, 'La autenticación multifactor ya está desactivada.')
        await checkPassword(account, req.body?.password)
        if (!consumeFactor(account, req.body?.codigo)) throw fail(400, 'El código es inválido o ya fue utilizado.')

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
