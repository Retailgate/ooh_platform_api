import express, { Request, Response } from "express";
import { Auth } from "../controllers/middleware.controller";
import { DashboardController } from "../controllers/dashboard.controller";
const router = express.Router();

router.get("/test", DashboardController.test);

router.get("/sites", DashboardController.getSiteData);

router.get("/behaviors", DashboardController.getSiteBehaviors);

router.post("/sites", DashboardController.addSite);

router.post("/batch", DashboardController.addMultipleSites);

router.put("/sites", DashboardController.updateSite);

router.patch("/sites", DashboardController.deleteSite);

router.get("/planning", DashboardController.planning);

router.get("/impressions", DashboardController.fetchImpressions);

router.get("/landmarks", DashboardController.getLandmarks);

router.get("/site_images/:id", DashboardController.getSiteImages);

router.get("/sites/areas", DashboardController.getAreas);

router.get("/sites/unis", DashboardController.getUNISSiteDetails);


export const DashboardRoute = router;
