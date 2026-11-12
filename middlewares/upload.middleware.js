const multer = require("multer")
const fs = require("fs")

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
        fs.mkdirSync("uploads/", { recursive: true })
        cb(null, "uploads/")
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`)
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