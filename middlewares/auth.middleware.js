const jwt = require('jsonwebtoken')
const jwtSecret = process.env.JWT_SECRET
const ClaimTypes = require('../config/claimtypes')
const { GeneraToken } = require('../services/jwttoken.service')

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

            const rolesPermitidos = rol.split(',').map(r => r.trim())

            if (!rolesPermitidos.includes(decodedToken[ClaimTypes.Role])) {
                const error = new Error('No tiene permisos para realizar esta acción.')
                error.statusCode = 403
                return next(error)
            }

            req.decodedToken = decodedToken

            const minutosRestantes =
                (decodedToken.exp - Math.floor(Date.now() / 1000)) / 60;

            if (minutosRestantes < 5) {
                const nuevoToken = GeneraToken(
                    decodedToken[ClaimTypes.Name],
                    decodedToken[ClaimTypes.GivenName],
                    decodedToken[ClaimTypes.Role]
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
                error.message = 'Token inválido o expirado.'
            }

            next(error)
        }
    }
}

module.exports = Authorize