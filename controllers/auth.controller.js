const bcrypt = require('bcrypt')
const crypto = require('crypto')
const { usuario, rol, Sequelize } = require('../models')
const { GeneraToken, TiempoRestanteToken } = require('../services/jwttoken.service')
const { BCRYPT_SALT_ROUNDS, validarEmail, validarNombre, validarPasswordFuerte } = require('../services/usuario.rules')
const validarCampos = require('../middlewares/validarCampos.middleware')

let self = {}

const crearError = (mensaje, statusCode = 400) => {
    const error = new Error(mensaje)
    error.statusCode = statusCode
    return error
}

self.registroValidator = [
    validarEmail,
    validarNombre,
    validarPasswordFuerte,
    validarCampos
]

self.login = async function (req, res, next) {
    try {
        const { email, password } = req.body || {}

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                mensaje: 'Debe proporcionar correo y contraseña.'
            })
        }

        let data = await usuario.findOne({
            where: { email: email },
            raw: true,
            attributes: [
                'id', 'email', 'nombre', 'passwordhash', [Sequelize.col('rol.nombre'), 'rol']],
            include: { model: rol, attributes: [] }
        })

        if (data === null)
            return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos.' })

        const passwordMatch = await bcrypt.compare(password, data.passwordhash)

        if (!passwordMatch)
            return res.status(401).json({mensaje: 'Usuario o contraseña incorrectos.'})

        const token = GeneraToken(data.email, data.nombre, data.rol)

        await req.bitacora('usuario.login', data.email)

        res.status(200).json({
            email: data.email,
            nombre: data.nombre,
            rol: data.rol,
            jwt: token
        })

    } catch (error) {
        next(error)
    }
}

self.registro = async function (req, res, next) {
    try {
        const { email, password, nombre } = req.body

        const existente = await usuario.findOne({ where: { email }, attributes: ['id'] })
        if (existente)
            throw crearError('No fue posible completar el registro con los datos proporcionados.', 409)

        const rolUsuario = await rol.findOne({ where: { nombre: 'Usuario' }, attributes: ['id'] })
        if (!rolUsuario)
            throw crearError('Error de configuración de roles en el servidor.', 500)

        const nuevoUsuario = await usuario.create({
            id: crypto.randomUUID(),
            email,
            passwordhash: await bcrypt.hash(password, BCRYPT_SALT_ROUNDS),
            nombre,
            rolid: rolUsuario.id,
            protegido: false
        })

        await req.bitacora('usuario.registro', nuevoUsuario.email)

        res.status(201).json({
            id: nuevoUsuario.id,
            email: nuevoUsuario.email,
            nombre: nuevoUsuario.nombre,
            rol: 'Usuario'
        })
    } catch (error) {
        next(error)
    }
}

self.tiempo = async function (req, res, next) {
    try {
        const tiempo = TiempoRestanteToken(req)

        if (tiempo === null)
            return res.status(401).send()

        res.status(200).send(tiempo)

    } catch (error) {
        next(error)
    }
}

module.exports = self