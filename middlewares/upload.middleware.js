const multer = require("multer")
const fs = require("node:fs")
const path = require("node:path")
const { randomUUID } = require("node:crypto")

const uploadsDir = path.resolve(__dirname, "../uploads")

const imageFilter = (req, file, cb) => {
    if (
        file.mimetype === "image/jpeg" &&
        file.originalname.toLowerCase().endsWith(".jpg")
    ) {
        cb(null, true)
    } else {
        const error = new Error("Solo se permiten imágenes con extensión JPG.")
        error.statusCode = 400
        cb(error)
    }
}

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdir(uploadsDir, { recursive: true }, error => cb(error, uploadsDir))
    },
    filename: (req, file, cb) => {
        cb(null, `${randomUUID()}-${file.originalname}`)
    }
})

var uploadFile = multer({
    storage: storage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
})

module.exports = uploadFile