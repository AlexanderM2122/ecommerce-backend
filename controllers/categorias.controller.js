const { categoria } = require('../models')
const { body, validationResult } = require('express-validator')

let self = {}

self.categoriaValidator = [
    body('nombre')
        .isString().withMessage('El nombre debe ser texto')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ max: 255 }).withMessage('El nombre es demasiado largo')
]

self.getAll = async function (req, res, next) {
    try {
        let data = await categoria.findAll({ attributes: [['id', 'categoriaid'], 'nombre', 'protegida'] })
        res.status(200).json(data)
    } catch (error) {
        next(error)
    }
}

self.get = async function (req, res, next) {
    try {
        const id = req.params.id
        const data = await categoria.findByPk( id, { attributes: [['id', 'categoriaid'], 'nombre', 'protegida'] })
        if (data)
            res.status(200).json(data)
        else
            res.status(404).send()
    } catch (error) {
        next(error)
    }
}

self.create = async function (req, res, next) {
    try {
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            const detalles = errors.array().map(error => ({
                campo: error.path,
                mensaje: error.msg
            }))

            const error = new Error('Los datos proporcionados no son válidos.')
            error.statusCode = 400
            throw error
        }

        let data = await categoria.create({
            nombre: req.body.nombre
        })

        await req.bitacora("categoria.crear", data.id)
        res.status(201).json(data)
    } catch (error) {
        next(error)
    }
}


self.update = async function (req, res, next) {
    try {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            const error = new Error('Los datos proporcionados no son válidos.')
            error.statusCode = 400
            throw error
        }

        const id = req.params.id
        const body = { nombre: req.body.nombre }

        const data = await categoria.update(body, { where: { id: id } })

        if (data[0] === 0)
            return res.status(404).send()

        await req.bitacora("categoria.editar", id)

        res.status(204).send()
    } catch (error) {
        next(error)
    }
}


self.delete = async function (req, res, next) {
    try {
        const id = req.params.id
        let data = await categoria.findByPk(id)
        if (!data)
            return res.status(404).send()

        if (data.protegida)
            return res.status(400).send()

        data = await categoria.destroy({ where: { id: id } })
        if (data == 1) {
            await req.bitacora("categoria.eliminar", id)
            return res.status(204).send()
        }
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}

module.exports = self