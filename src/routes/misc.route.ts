import express from "express";
import { Auth } from "../controllers/middleware.controller";
import { MiscController } from "../controllers/misc.controller";
const router = express.Router();

router.get("/test", MiscController.test);

router.get("/types", Auth.verifyToken, MiscController.getTypes);

export const MiscRoute = router;
