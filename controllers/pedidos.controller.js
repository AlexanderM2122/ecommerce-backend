const { param } = require('express-validator')
const { sequelize, carrito, producto, pedido, detallepedido, usuario } = require('../models')
const ClaimTypes = require('../config/claimtypes')
const validarCampos = require('../middlewares/validarCampos.middleware')

let self = {}

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

self.idParamValidator = [
    param('id')
        .isInt({ min: 1 }).withMessage('El identificador del pedido no es válido.')
        .toInt(),
    validarCampos
]

self.getAll = async function (req, res, next) {
    try {
        const actual = await obtenerUsuarioActual(req)
        const esAdmin = req.decodedToken?.[ClaimTypes.Role] === 'Administrador'

        const where = esAdmin ? {} : { usuarioid: actual.id }

        const pedidos = await pedido.findAll({
            where,
            include: [
                { model: usuario, attributes: ['email', 'nombre'] },
                {
                    model: detallepedido,
                    as: 'detalles',
                    include: [{ model: producto, attributes: ['id', 'titulo', 'archivoid'] }]
                }
            ],
            order: [['createdAt', 'DESC']]
        })

        res.status(200).json(pedidos)
    } catch (error) {
        next(error)
    }
}

self.get = async function (req, res, next) {
    try {
        const actual = await obtenerUsuarioActual(req)
        const esAdmin = req.decodedToken?.[ClaimTypes.Role] === 'Administrador'

        const where = esAdmin
            ? { id: req.params.id }
            : { id: req.params.id, usuarioid: actual.id }

        const encontrado = await pedido.findOne({
            where,
            include: [
                { model: usuario, attributes: ['email', 'nombre'] },
                {
                    model: detallepedido,
                    as: 'detalles',
                    include: [{ model: producto, attributes: ['id', 'titulo', 'archivoid'] }]
                }
            ]
        })

        if (!encontrado)
            return res.status(404).send()

        res.status(200).json(encontrado)
    } catch (error) {
        next(error)
    }
}

self.confirmarCompra = async function (req, res, next) {
    const t = await sequelize.transaction()
    try {
        const actual = await obtenerUsuarioActual(req)

        const itemsCarrito = await carrito.findAll({
            where: { usuarioid: actual.id },
            include: [{ model: producto, attributes: ['id', 'precio'] }],
            transaction: t
        })

        if (itemsCarrito.length === 0)
            throw crearError('El carrito está vacío.', 400)

        const total = Number(itemsCarrito.reduce(
            (acc, item) => acc + Number(item.producto.precio) * item.cantidad,
            0
        ).toFixed(2))

        const nuevoPedido = await pedido.create({
            usuarioid: actual.id,
            total,
            estado: 'Completado'
        }, { transaction: t })

        const detalles = itemsCarrito.map(item => ({
            pedidoid: nuevoPedido.id,
            productoid: item.productoid,
            cantidad: item.cantidad,
            preciounitario: Number(item.producto.precio)
        }))

        await detallepedido.bulkCreate(detalles, { transaction: t })
        await carrito.destroy({ where: { usuarioid: actual.id }, transaction: t })

        await t.commit()
        await req.bitacora('pedidos.crear', `${nuevoPedido.id}`)

        res.status(201).json({
            id: nuevoPedido.id,
            total: Number(nuevoPedido.total),
            estado: nuevoPedido.estado,
            createdAt: nuevoPedido.createdAt
        })
    } catch (error) {
        await t.rollback()
        next(error)
    }
}

module.exports = self