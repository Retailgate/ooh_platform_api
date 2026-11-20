import express from "express";
import { Auth } from "../controllers/middleware.controller";
import { MiscController } from "../controllers/misc.controller";
const router = express.Router();

router.get("/test", MiscController.test);

router.get("/types", Auth.verifyToken, MiscController.getTypes);

router.get("/landmarks", Auth.verifyToken, MiscController.getSiteLandmarks);

router.get("/landmarks/sites", Auth.verifyToken, MiscController.getSitesByLandmarkCategory);

router.get("/landmarks/categories", Auth.verifyToken, MiscController.getLandmarkCategories);


export const MiscRoute = router;
