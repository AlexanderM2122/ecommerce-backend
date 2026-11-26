const { body } = require('express-validator')

const BCRYPT_SALT_ROUNDS = 10
const EMAIL_MAX_LENGTH = 254
const NOMBRE_MIN_LENGTH = 2
const NOMBRE_MAX_LENGTH = 100
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 72
const PASSWORD_FUERTE_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/

const validarEmail = body('email')
    .isString().withMessage('El correo debe ser texto.')
    .trim().toLowerCase()
    .isEmail().withMessage('El correo electrónico no es válido.')
    .isLength({ max: EMAIL_MAX_LENGTH }).withMessage(`El correo no debe exceder ${EMAIL_MAX_LENGTH} caracteres.`)

const validarNombre = body('nombre')
    .isString().withMessage('El nombre debe ser texto.')
    .trim()
    .isLength({ min: NOMBRE_MIN_LENGTH, max: NOMBRE_MAX_LENGTH })
    .withMessage(`El nombre debe tener entre ${NOMBRE_MIN_LENGTH} y ${NOMBRE_MAX_LENGTH} caracteres.`)

const validarPasswordFuerte = body('password')
    .isString().withMessage('La contraseña debe ser texto.')
    .isLength({ min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })
    .withMessage(`La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`)
    .matches(PASSWORD_FUERTE_REGEX)
    .withMessage('La contraseña debe incluir mayúscula, minúscula, número y símbolo.')

module.exports = {
    BCRYPT_SALT_ROUNDS,
    NOMBRE_MIN_LENGTH,
    NOMBRE_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH,
    validarEmail,
    validarNombre,
    validarPasswordFuerte
}