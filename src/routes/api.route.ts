import express from "express";
import { APIController } from "../controllers/api.controller";
import { Auth } from "../controllers/middleware.controller";
const router = express.Router();

router.get("/test", Auth.verifyToken, APIController.test);

router.post("/get", Auth.verifyToken, APIController.generateKey);

router.post("/new", Auth.verifyToken, APIController.saveKey);

router.get("/", Auth.verifyToken, APIController.getAPIKeys);

router.patch("/:id", Auth.verifyToken, APIController.disableKey);

router.delete("/:id", Auth.verifyToken, APIController.deleteKey);

//API KEY ACCESSED ROUTES
router.get("/generate", Auth.verifyToken, APIController.generateImpressions);

export const APIRoute = router;
