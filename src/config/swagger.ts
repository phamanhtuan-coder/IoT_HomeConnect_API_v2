import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import * as fs from "node:fs";

const swaggerDocument = JSON.parse(fs.readFileSync("./swagger/swagger.json", "utf8"));

export const setupSwagger = (app: Express) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));};
