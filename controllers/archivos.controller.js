const { archivo } = require('../models')
const archivosFS = require('node:fs/promises')
const { rutaArchivo, eliminarArchivo, guardarConImagen } = require('../services/archivos.service')

let self = {}

const crearError = (mensaje, statusCode = 400) => {
    const error = new Error(mensaje)
    error.statusCode = statusCode
    return error
}

self.getAll = async function (req, res, next) {
    try {
        const data = await archivo.findAll({
            attributes: [
                ['id', 'archivoId'], 'mime', 'indb', 'nombre', 'size'] })
        res.status(200).json(data)

    } catch (error) {
        next(error)
    }
}

self.getDetalle = async function (req, res, next) {
    try {
        const id = req.params.id

        const data = await archivo.findByPk(id, {
            attributes: [['id', 'archivoId'], 'mime', 'indb', 'nombre', 'size'] })

        if (data)
            return res.status(200).json(data)

        res.status(404).send()
    } catch (error) {
        next(error)
    }
}

self.get = async function (req, res, next) {
    try {
        const id = req.params.id
        const data = await archivo.findByPk(id)

        if (!data)
            return res.status(404).send()

        let imagen = data.datos

        if (!data.indb) {
            try {
                imagen = await archivosFS.readFile(rutaArchivo(data.nombre))
            } catch (error) {
                if (error.code === 'ENOENT')
                    return res.status(404).send()
                throw error
            }
        }

        if (!imagen)
            return res.status(404).send()

        res.status(200)
            .contentType('image/jpeg')
            .set('X-Content-Type-Options', 'nosniff')
            .send(imagen)
    } catch (error) {
        next(error)
    }
}

self.create = async function (req, res, next) {
    try {
        if (!req.file)
            throw crearError('El archivo es obligatorio.')

        const data = await guardarConImagen(req, registro => registro)

        res.status(201).json({
            id: data.id,
            mime: data.mime,
            indb: data.indb,
            nombre: data.nombre
        })

    } catch (error) {
        next(error)
    }
}

self.update = async function (req, res, next) {
    let nombreTemporal = req.file?.filename

    try {
        if (!req.file)
            throw crearError('El archivo es obligatorio.')

        const id = req.params.id
        const imagen = await archivo.findByPk(id)
        if (!imagen)
            return res.status(404).send()

        const indb = process.env.FILES_IN_DB === 'true'
        let binario = null

        if (indb) {
            binario = await archivosFS.readFile(
                rutaArchivo(req.file.filename)
            )
        }

        const nombreAnterior = imagen.nombre
        const estabaEnBD = imagen.indb

        const data = await archivo.update({
            mime: req.file.mimetype,
            indb: indb,
            nombre: req.file.filename,
            size: req.file.size,
            datos: binario
        }, { where: { id: id } })

        if (data[0] === 0)
            return res.status(404).send()

        nombreTemporal = null

        if (indb)
            await eliminarArchivo(req.file.filename)

        if (!estabaEnBD)
            await eliminarArchivo(nombreAnterior)

        await req.bitacora('archivos.editar', id)
        res.status(204).send()

    } catch (error) {
        next(error)
    } finally {
        await eliminarArchivo(nombreTemporal)
    }
}

self.delete = async function (req, res, next) {
    try {
        const id = req.params.id
        const imagen = await archivo.findByPk(id)

        if (!imagen)
            return res.status(404).send()

        const data = await archivo.destroy({
            where: { id: id }
        })

        if (data !== 1)
            return res.status(404).send()

        if (!imagen.indb) {
            await eliminarArchivo(imagen.nombre)
        }

        await req.bitacora('archivos.eliminar', id)

        res.status(204).send()
    } catch (error) {
        next(error)
    }
}

module.exports = self