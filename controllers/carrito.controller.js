const { body, param } = require('express-validator')
const { carrito, producto, usuario } = require('../models')
const ClaimTypes = require('../config/claimtypes')
const validarCampos = require('../middlewares/validarCampos.middleware')

let self = {}

const CANTIDAD_MIN = 1
const CANTIDAD_MAX = 99

const crearError = (mensaje, statusCode = 400) => {
    const error = new Error(mensaje)
    error.statusCode = statusCode
    return error
}

const obtenerUsuarioActual = async (req) => {
    const email = req.decodedToken?.[ClaimTypes.Name]
    const actual = await usuario.findOne({ where: { email }, attributes: ['id', 'email'] })
    if (!actual)
        throw crearError('Usuario no válido.', 401)
    return actual
}

self.agregarValidator = [
    body('productoid')
        .isInt({ min: 1 }).withMessage('El identificador del producto no es válido.')
        .toInt(),
    body('cantidad')
        .optional()
        .isInt({ min: CANTIDAD_MIN, max: CANTIDAD_MAX })
        .withMessage(`La cantidad debe estar entre ${CANTIDAD_MIN} y ${CANTIDAD_MAX}.`)
        .toInt(),
    validarCampos
]

self.actualizarValidator = [
    param('productoid')
        .isInt({ min: 1 }).withMessage('El identificador del producto no es válido.')
        .toInt(),
    body('cantidad')
        .isInt({ min: CANTIDAD_MIN, max: CANTIDAD_MAX })
        .withMessage(`La cantidad debe estar entre ${CANTIDAD_MIN} y ${CANTIDAD_MAX}.`)
        .toInt(),
    validarCampos
]

self.productoParamValidator = [
    param('productoid')
        .isInt({ min: 1 }).withMessage('El identificador del producto no es válido.')
        .toInt(),
    validarCampos
]

self.getAll = async function (req, res, next) {
    try {
        const actual = await obtenerUsuarioActual(req)

        const items = await carrito.findAll({
            where: { usuarioid: actual.id },
            include: [{
                model: producto,
                attributes: ['id', 'titulo', 'precio', 'archivoid']
            }],
            order: [['createdAt', 'ASC']]
        })

        const resultado = items.map(item => ({
            id: item.id,
            productoid: item.productoid,
            titulo: item.producto.titulo,
            precio: Number(item.producto.precio),
            archivoid: item.producto.archivoid,
            cantidad: item.cantidad,
            subtotal: Number((Number(item.producto.precio) * item.cantidad).toFixed(2))
        }))

        const total = Number(resultado.reduce((acc, i) => acc + i.subtotal, 0).toFixed(2))

        res.status(200).json({ items: resultado, total })
    } catch (error) {
        next(error)
    }
}

self.agregar = async function (req, res, next) {
    try {
        const actual = await obtenerUsuarioActual(req)
        const { productoid } = req.body
        const cantidadSolicitada = req.body.cantidad ?? 1

        const prod = await producto.findByPk(productoid, { attributes: ['id'] })
        if (!prod)
            throw crearError('El producto seleccionado no existe.', 404)

        const existente = await carrito.findOne({
            where: { usuarioid: actual.id, productoid }
        })

        if (existente) {
            const nuevaCantidad = existente.cantidad + cantidadSolicitada
            if (nuevaCantidad > CANTIDAD_MAX)
                throw crearError(`No puedes agregar más de ${CANTIDAD_MAX} unidades por producto.`, 400)

            existente.cantidad = nuevaCantidad
            await existente.save()
            await req.bitacora('carrito.actualizar', `${productoid}`)
            return res.status(200).json(existente)
        }

        const creado = await carrito.create({
            usuarioid: actual.id,
            productoid,
            cantidad: cantidadSolicitada
        })

        await req.bitacora('carrito.agregar', `${productoid}`)
        res.status(201).json(creado)
    } catch (error) {
        next(error)
    }
}

self.actualizarCantidad = async function (req, res, next) {
    try {
        const actual = await obtenerUsuarioActual(req)
        const { productoid } = req.params
        const { cantidad } = req.body

        const [actualizados] = await carrito.update(
            { cantidad },
            { where: { usuarioid: actual.id, productoid } }
        )

        if (actualizados === 0)
            return res.status(404).send()

        await req.bitacora('carrito.actualizar', `${productoid}`)
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}

self.eliminar = async function (req, res, next) {
    try {
        const actual = await obtenerUsuarioActual(req)
        const { productoid } = req.params

        const eliminados = await carrito.destroy({
            where: { usuarioid: actual.id, productoid }
        })

        if (eliminados === 0)
            return res.status(404).send()

        await req.bitacora('carrito.eliminar', `${productoid}`)
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}

module.exports = self