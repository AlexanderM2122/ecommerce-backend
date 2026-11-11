const express = require('express')
const dotnev = require('dotenv')
const app = express()

dotnev.config()

app.get("/", (req, res) => {
    res.send("Hola mundo desde nodemon!")
})

app.listen(process.env.SERVER_PORT, () => {
    console.log(`Aplicacion de ejemplo escuchando en el puerto ${process.env.SERVER_PORT}`)
})