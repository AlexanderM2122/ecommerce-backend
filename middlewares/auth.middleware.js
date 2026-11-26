const jwt = require('jsonwebtoken')
const jwtSecret = process.env.JWT_SECRET
const ClaimTypes = require('../config/claimtypes')
const { GeneraToken } = require('../services/jwttoken.service')
const { usuario, rol: roleModel } = require('../models')

const Authorize = (rol) => {
    return async (req, res, next) => {
        try {
            const authHeader = req.header('Authorization')

            if (!authHeader || !/^Bearer \S+$/.test(authHeader)) {
                const error = new Error('Acceso denegado.')
                error.statusCode = 401
                return next(error)
            }

            const token = authHeader.split(' ')[1]
            const decodedToken = jwt.verify(token, jwtSecret, {
                algorithms: ['HS256'],
                issuer: 'ServidorFeiJWT',
                audience: 'ClientesFeiJWT'
            })

            const account = await usuario.findOne({
                where: { email: decodedToken[ClaimTypes.Name] },
                attributes: ['id', 'email', 'nombre', 'authVersion', 'correoVerificadoEn', 'mfaSecreto'],
                include: { model: roleModel, attributes: ['nombre'] }
            })
            if (!account?.correoVerificadoEn || account.authVersion !== (decodedToken.av ?? null)) {
                return next(Object.assign(new Error('La sesi�n venci�. Vuelve a ingresar.'), { statusCode: 401 }))
            }
            const rolesPermitidos = rol.split(',').map(r => r.trim())

            if (!rolesPermitidos.includes(account.rol.nombre) || account.rol.nombre !== decodedToken[ClaimTypes.Role]) {
                const error = new Error('No tiene permisos para realizar esta acci�n.')
                error.statusCode = 403
                return next(error)
            }

            req.decodedToken = decodedToken
            req.authAccount = account

            const minutosRestantes =
                (decodedToken.exp - Math.floor(Date.now() / 1000)) / 60;

            if (minutosRestantes < 5) {
                const nuevoToken = GeneraToken(
                    account.email,
                    account.nombre,
                    account.rol.nombre,
                    account.authVersion
                );
                res.header('Set-Authorization', nuevoToken)
            }

            next()

        } catch (error) {
            if (
                error.name === 'TokenExpiredError' ||
                error.name === 'JsonWebTokenError' ||
                error.name === 'NotBeforeError'
            ) {
                error.statusCode = 401;
                error.message = 'Token inv�lido o expirado.'
            }

            next(error)
        }
    }
}

module.exports = Authorize