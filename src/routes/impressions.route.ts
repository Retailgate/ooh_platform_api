import express from "express";
import { Auth } from "../controllers/middleware.controller";
import { ImpressionsController } from "../controllers/impressions.controller";
const router = express.Router();

router.get("/test", ImpressionsController.test);

router.get("/", Auth.verifyToken, ImpressionsController.getImpressionTrends);

export const ImpressionsRoute = router;
