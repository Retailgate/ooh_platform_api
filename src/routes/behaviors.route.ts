import express from "express";
import { Auth } from "../controllers/middleware.controller";
import { BehaviorsController } from "../controllers/behaviors.controller";
const router = express.Router();

router.get("/test", BehaviorsController.test);

router.get("/options", Auth.verifyToken, BehaviorsController.getOptions);

router.get("/site", Auth.verifyToken, BehaviorsController.getSiteBehaviors)

router.post("/", Auth.verifyToken, BehaviorsController.getPlanningResults);


export const BehaviorsRoute = router;
