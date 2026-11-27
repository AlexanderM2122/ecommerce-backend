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

const obtenerUsuarioActual = async (req, transaction) => {
    const email = req.decodedToken?.[ClaimTypes.Name]
    const actual = await usuario.findOne({
        where: { email },
        attributes: ['id', 'email'],
        ...(transaction && { transaction, lock: transaction.LOCK.UPDATE })
    })
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
    try {
        const nuevoPedido = await sequelize.transaction(async transaction => {
            // El bloqueo del usuario serializa las confirmaciones de su carrito.
            const actual = await obtenerUsuarioActual(req, transaction)

            const itemsCarrito = await carrito.findAll({
                where: { usuarioid: actual.id },
                attributes: ['id', 'productoid', 'cantidad'],
                transaction,
                lock: transaction.LOCK.UPDATE
            })

            if (itemsCarrito.length === 0)
                throw crearError('El carrito está vacío.', 400)

            const productos = await producto.findAll({
                where: { id: itemsCarrito.map(item => item.productoid) },
                attributes: ['id', 'precio'],
                transaction
            })
            const precios = new Map(productos.map(item => [item.id, item.precio]))

            // MySQL devuelve los DECIMAL como texto. Se suman centavos enteros.
            const centavos = itemsCarrito.reduce((suma, item) => {
                const [entero, fraccion = ''] = String(precios.get(item.productoid)).split('.')
                return suma + BigInt(entero + fraccion.padEnd(2, '0')) * BigInt(item.cantidad)
            }, 0n)
            const total = `${centavos / 100n}.${(centavos % 100n).toString().padStart(2, '0')}`

            const creado = await pedido.create({
                usuarioid: actual.id,
                total,
                estado: 'Completado'
            }, { transaction })

            await detallepedido.bulkCreate(itemsCarrito.map(item => ({
                pedidoid: creado.id,
                productoid: item.productoid,
                cantidad: item.cantidad,
                preciounitario: precios.get(item.productoid)
            })), { transaction })

            await carrito.destroy({
                where: { usuarioid: actual.id, id: itemsCarrito.map(item => item.id) },
                transaction
            })
            await req.bitacora('pedidos.crear', `${creado.id}`, { transaction })
            return creado
        })

        res.status(201).json({
            id: nuevoPedido.id,
            total: Number(nuevoPedido.total),
            estado: nuevoPedido.estado,
            createdAt: nuevoPedido.createdAt
        })
    } catch (error) {
        next(error)
    }
}

module.exports = self