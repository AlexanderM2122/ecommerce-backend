const { body, validationResult } = require('express-validator')
const { usuario, rol, Sequelize } = require('../models')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

let self = {}


self.usuarioCreateValidator = [
    body('email')
        .isEmail().withMessage('El correo electrónico no es válido.')
        .isLength({ max: 255 }).withMessage('El correo es demasiado largo.'),

    body('nombre')
        .isString().withMessage('El nombre debe ser texto.')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio.')
        .isLength({ max: 255 }).withMessage('El nombre es demasiado largo.'),

    body('password')
        .isString().withMessage('La contraseña debe ser texto.')
        .isLength({ min: 8, max: 72 })
        .withMessage('La contraseña debe tener entre 8 y 72 caracteres.'),

    body('rol')
        .isIn(['Administrador', 'Usuario'])
        .withMessage('El rol no es válido.')
]

self.usuarioUpdateValidator = [
    body('nombre')
        .isString().withMessage('El nombre debe ser texto.')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio.')
        .isLength({ max: 255 }).withMessage('El nombre es demasiado largo.'),

    body('rol')
        .isIn(['Administrador', 'Usuario'])
        .withMessage('El rol no es válido.')
]

const crearError = (mensaje, statusCode = 400) => {
    const error = new Error(mensaje)
    error.statusCode = statusCode
    return error
}

self.getAll = async function (req, res, next) {
    try {
        const data = await usuario.findAll({
            raw: true,
            attributes: [
                'id', 'email', 'nombre', [Sequelize.col('rol.nombre'), 'rol']],
            include: { model: rol, attributes: [] }
        })

        res.status(200).json(data)
    } catch (error) {
        next(error)
    }
}

self.get = async function (req, res, next) {
    try {
        const email = req.params.email

        const data = await usuario.findOne({
            where: { email: email },
            raw: true,
            attributes: [
                'id', 'email', 'nombre', [Sequelize.col('rol.nombre'), 'rol']],
            include: { model: rol, attributes: [] }
        })

        if (data)
            return res.status(200).json(data)

        res.status(404).send()
    } catch (error) {
        next(error)
    }
}

self.create = async function (req, res, next) {
    try {
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            const error = new Error("Los datos del usuario no son válidos.")
            error.statusCode = 400
            throw error
        }

        const rolusuario = await rol.findOne({
            where: { nombre: req.body.rol }
        })

        if (!rolusuario) {
            const error = new Error("El rol indicado no existe.")
            error.statusCode = 400
            throw error
        }

        const data = await usuario.create({
            id: crypto.randomUUID(),
            email: req.body.email,
            passwordhash: await bcrypt.hash(req.body.password, 10),
            nombre: req.body.nombre,
            rolid: rolusuario.id
        })

        await req.bitacora("usuarios.crear", data.email)

        res.status(201).json({
            id: data.id,
            email: data.email,
            nombre: data.nombre,
            rolid: rolusuario.nombre
        })

    } catch (error) {
        next(error)
    }
}

self.update = async function (req, res, next) {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const error = new Error("Los datos proporcionados no son válidos.")
            error.statusCode = 400
            throw error
        }

        const email = req.params.email

        const existente = await usuario.findOne({ where: { email: email } })

        if (!existente)
            return res.status(404).send();

        const rolusuario = await rol.findOne({ where: { nombre: req.body.rol } })

        if (!rolusuario) {
            const error = new Error("El rol indicado no existe.")
            error.statusCode = 400
            throw error
        }

        const body = {
            nombre: req.body.nombre,
            rolid: rolusuario.id
        }

        const data = await usuario.update(body, {
            where: { email: email }
        })

        if (data[0] === 0)
            return res.status(404).send()

        await req.bitacora("usuarios.editar", email)
        res.status(204).send()

    } catch (error) {
        next(error)
    }
}

self.delete = async function (req, res, next) {
    try {
        const email = req.params.email

        let data = await usuario.findOne({ where: { email: email } })

        if (!data)
            return res.status(404).send()

        if (data.protegido)
            return res.status(403).send()

        data = await usuario.destroy({
            where: { email: email, protegido: false }
        })

        if (data === 1) {
            await req.bitacora('usuarios.eliminar', email)
            return res.status(204).send()
        }

        res.status(404).send()
    } catch (error) {
        next(error)
    }
}

module.exports = self