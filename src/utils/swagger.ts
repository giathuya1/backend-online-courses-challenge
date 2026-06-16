// src/utils/swagger.ts
import swaggerJSDoc from 'swagger-jsdoc';

export function createSwaggerSpec(): object {
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
    // Trỏ vào cả JS cũ lẫn TS mới để Swagger vẫn đọc được @openapi comments
    apis: ['./src/routes/*.ts', './src/middleware/*.ts', './routes/*.js', './middleware/*.js']
  });
}