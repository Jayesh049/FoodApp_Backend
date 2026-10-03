const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const openapiDefinition = require("../docs/openapi");

const swaggerSpec = swaggerJsdoc({
  definition: openapiDefinition,
  apis: [path.join(__dirname, "../docs/swagger.fragments.js")],
});

function mountSwagger(app) {
  app.get("/api/docs.json", (_req, res) => {
    res.status(200).json(swaggerSpec);
  });

  app.use("/api/docs", (req, res, next) => {
    // Swagger UI needs inline styles/scripts that default Helmet CSP blocks.
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self' data:"
    );
    next();
  });

  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: "FoodApp API docs",
    })
  );
}

module.exports = { mountSwagger, swaggerSpec };
