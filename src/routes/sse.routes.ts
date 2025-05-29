import { Router } from "express";
import SSEController from "../controllers/sse.controller";

const sseRoutes = Router();

sseRoutes.get('/events', SSEController.getEvents);
sseRoutes.post('/', SSEController.postSomeAction);

export default sseRoutes;