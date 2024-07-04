import express, { Request, Response } from 'express';
import { Auth } from '../controllers/middleware.controller'
import { DashboardController } from '../controllers/dashboard.controller';
const router = express.Router();

router.get("/test", Auth.verifyToken, DashboardController.test);

router.get("/sites", Auth.verifyToken, DashboardController.getSiteData);

router.get("/behaviors", Auth.verifyToken, DashboardController.getSiteBehaviors);

router.post("/sites", Auth.verifyToken, DashboardController.addSite);

router.post("/batch",Auth.verifyToken, DashboardController.addMultipleSites);

router.put("/sites", Auth.verifyToken, DashboardController.updateSite);

router.patch("/sites", Auth.verifyToken, DashboardController.deleteSite);

router.get("/planning", Auth.verifyToken, DashboardController.planning);

router.get("/impressions",Auth.verifyToken, DashboardController.fetchImpressions);

router.get("/landmarks",Auth.verifyToken,DashboardController.getLandmarks)

export const DashboardRoute = router;
