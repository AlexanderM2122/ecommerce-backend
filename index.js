const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const app = express()

dotenv.config()

app.use(express.json())
app.disable('x-powered-by')
app.use(express.urlencoded({ extended: false }))

const corsOptions = {
    origin: ['http://localhost:8080', 'http://localhost:8081'],
    methods: 'GET,PUT,POST,DELETE'
};
app.use(cors(corsOptions))

const fs = require('fs')
const path = require('path')
const swaggerPath = path.join(__dirname, 'swagger-output.json')

if (fs.existsSync(swaggerPath)) {
    const swaggerUi = require('swagger-ui-express')
    const swaggerFile = require('./swagger-output.json')

    app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerFile))
}

app.use(require('./middlewares/bitacora.middleware'))

app.use('/api/categorias', require('./routes/categorias.routes'))
app.use('/api/productos', require('./routes/productos.routes'))
app.use('/api/usuarios', require('./routes/usuarios.routes'))
app.use('/api/roles', require('./routes/roles.routes'))
app.use('/api/auth', require('./routes/auth.routes'))
app.use('/api/archivos', require('./routes/archivos.routes'))
app.use('/api/bitacora', require('./routes/bitacora.routes'))

app.use((req, res, next) => {
    const error = new Error('Recurso no encontrado.')
    error.statusCode = 404
    next(error)
})

app.use(require('./middlewares/errorhandler.middleware'))

app.listen(process.env.SERVER_PORT, () => {
    console.log(`Aplicación escuchando en el puerto ${process.env.SERVER_PORT}`)
})