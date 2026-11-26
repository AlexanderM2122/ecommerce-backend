const router = require('express').Router()
const pedidos = require('../controllers/pedidos.controller')
const Authorize = require('../middlewares/auth.middleware')

router.get('/', Authorize('Usuario,Administrador'), pedidos.getAll)
router.get('/:id', Authorize('Usuario,Administrador'), pedidos.idParamValidator, pedidos.get)
router.post('/', Authorize('Usuario,Administrador'), pedidos.confirmarCompra)

module.exports = router