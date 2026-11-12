const fs = require('fs')
const path = require('path')
const requestIp = require('request-ip')
const ClaimTypes = require('../config/claimtypes')

const errorHandler = (err, req, res, next) => {
    let mensaje = 'No se ha podido procesar la petición. Inténtelo nuevamente más tarde.'
    let statusCode = err.statusCode || 500

    if (err.name === 'SequelizeUniqueConstraintError') {
        statusCode = 409
        mensaje = 'No se puede completar la operación solicitada.'
    } else if (err.name === 'SequelizeValidationError') {
        statusCode = 400
        mensaje = 'Los datos proporcionados no son válidos.'
    } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        statusCode = 409
        mensaje = 'No se puede completar la operación solicitada.'
    } else if (err.name === 'MulterError') {
        statusCode = 400
        mensaje = 'Error al procesar el archivo enviado.'
    } else if (statusCode >= 400 && statusCode < 500) {
        mensaje = err.message || mensaje
    }

    if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
        statusCode = 500
    }

    const ip = requestIp.getClientIp(req)
    let email = 'Anónimo'

    if (req.decodedToken) {
        email = req.decodedToken[ClaimTypes.Name] || email
    }

    const logDir = path.join(__dirname, '../log')
    fs.mkdirSync(logDir, { recursive: true })

    const detalle = String(err.message || mensaje)
        .replace(/[\r\n]+/g, ' ')

    fs.appendFile(
        path.join(logDir, 'log.txt'),
        `${new Date().toISOString()} - ${statusCode} - ${ip} - ${email} - ${detalle}\n`,
        error => {
            if (error) console.error(error)
        }
    )

    res.status(statusCode).json({
        status: statusCode,
        mensaje: mensaje
    })
}

module.exports = errorHandler
