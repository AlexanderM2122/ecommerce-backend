const router = require('express').Router()
const carrito = require('../controllers/carrito.controller')
const Authorize = require('../middlewares/auth.middleware')

router.get('/', Authorize('Usuario,Administrador'), carrito.getAll)
router.post('/', Authorize('Usuario,Administrador'), carrito.agregarValidator, carrito.agregar)
router.put('/:productoid', Authorize('Usuario,Administrador'), carrito.actualizarValidator, carrito.actualizarCantidad)
router.delete('/:productoid', Authorize('Usuario,Administrador'), carrito.productoParamValidator, carrito.eliminar)

module.exports = router