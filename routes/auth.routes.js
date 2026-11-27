const router = require('express').Router()
const auth = require('../controllers/auth.controller')
const authorize = require('../middlewares/auth.middleware')
const limit = require('../middlewares/auth-rate.middleware')

const account = authorize('Usuario,Administrador')

router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
})

router.post('/', limit('login', 300, 8), auth.login)
router.post('/registro', limit('register', 40, 5), auth.registroValidator, auth.registro)
router.post('/reenviar-verificacion', limit('resend', 100, 5), auth.emailValidator, auth.reenviar)
router.post('/verificar-correo', limit('verify', 200), auth.verificar)
router.post('/recuperar-password', limit('forgot', 100, 5), auth.emailValidator, auth.recuperar)
router.post('/restablecer-password', limit('reset', 100), auth.passwordValidator, auth.restablecer)

router.post('/mfa/login', limit('mfa-login', 300), auth.segundoFactor)
router.get('/mfa', account, auth.estadoMfa)
router.post('/mfa/preparar', account, limit('mfa-prepare', 100, 5), auth.prepararMfa)
router.post('/mfa/activar', account, limit('mfa-enable', 100, 10), auth.activarMfa)
router.post('/mfa/desactivar', account, limit('mfa-disable', 100, 5), auth.desactivarMfa)

router.get('/tiempo', account, auth.tiempo)

// Conserva los mensajes de validación. Los errores internos pueden contener SQL.
router.use((error, req, res, next) => {
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ mensaje: 'No se puede completar la operación solicitada.' })
    }
    if (error.statusCode >= 400 && error.statusCode < 600) return next(error)
    console.error('Error interno de autenticación:', error.name)
    next(new Error('Error interno de autenticación.'))
})

module.exports = router
