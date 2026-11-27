const { archivo, sequelize } = require('../models')
const archivosFS = require('node:fs/promises')
const path = require('node:path')

const uploadsDir = path.resolve(__dirname, '../uploads')

const crearError = (mensaje) => {
    const error = new Error(mensaje)
    error.statusCode = 400
    return error
}

const rutaArchivo = (nombre) => {
    if (
        typeof nombre !== 'string' ||
        !nombre ||
        nombre !== path.basename(nombre)
    ) {
        throw crearError('Nombre de archivo inválido.')
    }

    return path.join(uploadsDir, nombre)
}

const eliminarArchivo = async (nombre) => {
    if (!nombre) return

    try {
        await archivosFS.unlink(rutaArchivo(nombre))
    } catch (error) {
        if (error.code !== 'ENOENT')
            console.error('Error al eliminar archivo:', error)
    }
}

async function guardarConImagen(req, guardar) {
    const imagen = req.file
    const indb = process.env.FILES_IN_DB === 'true'
    let confirmado = false

    try {
        let datos
        if (imagen) {
            datos = await archivosFS.readFile(rutaArchivo(imagen.filename))
            if (datos.length < 4 || datos[0] !== 0xff || datos[1] !== 0xd8 || datos[2] !== 0xff) {
                throw crearError('El archivo no tiene una firma JPEG válida.')
            }
        }

        const resultado = await sequelize.transaction(async transaction => {
            let registro
            if (imagen) {
                registro = await archivo.create({
                    mime: imagen.mimetype,
                    indb,
                    nombre: imagen.filename,
                    size: imagen.size,
                    datos: indb ? datos : null
                }, { transaction })
                await req.bitacora('archivos.crear', registro.id, { transaction })
            }
            return guardar(registro, transaction)
        })

        confirmado = true
        return resultado
    } finally {
        if (imagen && (!confirmado || indb)) {
            await eliminarArchivo(imagen.filename)
        }
    }
}

module.exports = { rutaArchivo, eliminarArchivo, guardarConImagen }
