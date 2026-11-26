const swaggerAutogen = require('swagger-autogen')()

const doc = {
    info: {
        title: 'Backend Node.js API',
        description: 'API RESTful para Ecommerce en Node.js con Express y Sequelize'
    },
    host: 'localhost:3000'
}

const outputFile = './swagger-output.json'
const routes = ['./index.js']

swaggerAutogen(outputFile, routes, doc)