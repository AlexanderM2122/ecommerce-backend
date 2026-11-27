const { producto,categoria, Sequelize } = require('../models')
const { body, validationResult } = require('express-validator')
const { guardarConImagen, eliminarArchivo } = require('../services/archivos.service')

let self = {}

self.productoValidator = [
    body('titulo')
        .isString()
        .trim()
        .notEmpty()
        .isLength({ min: 2, max: 255 }),

    body('descripcion')
        .isString()
        .trim()
        .notEmpty()
        .isLength({ min: 5, max: 2000 }),

    body('precio')
        .custom(value => {
            if (
                typeof value !== 'number' &&
                typeof value !== 'string'
            ) return false

            const texto = String(value)

            return /^\d+(\.\d{1,2})?$/.test(texto) &&
                Number(texto) >= 0.01 &&
                Number(texto) <= 99999999.99
        })
]

self.getAll = async function (req, res, next) {
    try {
        const { s } = req.query

        let filtros = {}
        if (s) {
            filtros.titulo = {
                [Sequelize.Op.like]: `%${s}%`
            }
        }

        let data = await producto.findAll({
            attributes: [['id', 'productoId'], 'titulo', 'descripcion', 'precio', 'archivoid'],
            include: [{
                model: categoria,
                as: 'categorias',
                attributes: [['id', 'categoriaId'], 'nombre', 'protegida'],
                through: { attributes: [] }
            }],
            where: filtros,
            subQuery: false
        });

        return res.status(200).json(data)
    } catch (error) {
        next(error)
    }
}

self.get = async function (req, res, next) {
    try {
        let id = req.params.id;

        let data = await producto.findByPk(id, {
            attributes: [['id', 'productoId'], 'titulo', 'descripcion', 'precio', 'archivoid'],
            include: [{
                model: categoria,
                as: 'categorias',
                attributes: [['id', 'categoriaId'], 'nombre', 'protegida'],
                through: { attributes: [] }
            }]
        })

        if (data) {
            res.status(200).json(data)
        } else {
            res.status(404).send()
        }
    } catch (error) {
        next(error)
    }
}

async function guardarProducto(req, res, next, actualizar) {
    try {
        if (!validationResult(req).isEmpty()) {
            await eliminarArchivo(req.file?.filename)
            return res.status(400).json({ mensaje: 'Los datos proporcionados no son válidos.' })
        }

        const resultado = await guardarConImagen(req, async (imagen, transaction) => {
            const datos = {
                titulo: req.body.titulo,
                descripcion: req.body.descripcion,
                precio: req.body.precio,
                archivoid: imagen?.id ?? req.body.archivoid
            }

            if (!actualizar) {
                const creado = await producto.create({
                    ...datos,
                    archivoid: datos.archivoid || null
                }, { transaction })
                await req.bitacora('producto.crear', creado.id, { transaction })
                return creado
            }

            const id = req.params.id
            const [filas] = await producto.update(datos, { where: { id }, transaction })
            if (filas === 0) {
                const error = new Error('El producto no se encontró.')
                error.statusCode = 404
                throw error
            }

            await req.bitacora('producto.editar', id, { transaction })
        })

        return actualizar ? res.status(204).send() : res.status(201).json(resultado)
    } catch (error) {
        if (actualizar && error.statusCode === 404)
            return res.status(404).send()
        next(error)
    }
}

self.create = (req, res, next) => guardarProducto(req, res, next, false)
self.update = (req, res, next) => guardarProducto(req, res, next, true)

self.delete = async function (req, res, next) {
    try {
        let id = req.params.id;
        let data = await producto.findByPk(id)

        if (!data)
            return res.status(404).send()

        data = await producto.destroy({ where: { id: id } })

        if (data === 1) {
            await req.bitacora("producto.eliminar", id)
            return res.status(204).send()
        }

        res.status(404).send()
    } catch (error) {
        next(error)
    }
}


self.asignaCategoria = async function (req, res, next) {
    try {
        let itemToAssign = await categoria.findByPk(req.body.categoriaid)
        if (!itemToAssign) return res.status(404).send()

        let item = await producto.findByPk(req.params.id)
        if (!item) return res.status(404).send()

        await item.addCategoria(itemToAssign)

        await req.bitacora("productocategoria.agregar", `${req.params.id}:${req.body.categoriaid}`)
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}


self.eliminaCategoria = async function (req, res, next) {
    try {
        let itemToRemove = await categoria.findByPk(req.params.categoriaid)
        if (!itemToRemove) return res.status(404).send()

        let item = await producto.findByPk(req.params.id)
        if (!item) return res.status(404).send()

        await item.removeCategoria(itemToRemove)

        await req.bitacora("productocategoria.remover", `${req.params.id}:${req.params.categoriaid}`)
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}

module.exports = self