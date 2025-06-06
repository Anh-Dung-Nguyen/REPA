const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
PORT = 8000;

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'REPA API',
            version: '1.0.0',
            description: 'API documentation for REPA project',
        },
    },
    apis: ['./routers/*.js'], 
};

const swaggerSpec = swaggerJSDoc(options);

function setupSwagger(app) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = setupSwagger;