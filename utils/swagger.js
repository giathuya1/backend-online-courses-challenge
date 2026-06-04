'use strict';

const swaggerJSDoc = require('swagger-jsdoc');

function createSwaggerSpec() {
  const port = process.env.PORT || 5000;

  return swaggerJSDoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Online Learning API',
        version: '1.0.0',
        description: 'Swagger UI for demo/testing'
      },
      servers: [{ url: `http://localhost:${port}` }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
        }
      }
    },
    apis: ['./routes/*.js', './middleware/*.js']
  });
}

module.exports = { createSwaggerSpec };