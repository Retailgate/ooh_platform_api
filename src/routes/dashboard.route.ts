import express, { Request, Response } from "express";
import { Auth } from "../controllers/middleware.controller";
import { DashboardController } from "../controllers/dashboard.controller";
const router = express.Router();

router.get("/test", DashboardController.test);

router.get("/sites", Auth.verifyToken, DashboardController.getSiteData);

router.get("/behaviors",Auth.verifyToken, DashboardController.getSiteBehaviors);

router.post("/sites",Auth.verifyToken, DashboardController.addSite);

router.post("/batch",Auth.verifyToken, DashboardController.addMultipleSites);

router.put("/sites",Auth.verifyToken, DashboardController.updateSite);

router.patch("/sites",Auth.verifyToken, DashboardController.deleteSite);

router.get("/planning",Auth.verifyToken, DashboardController.planning);

router.get("/impressions",Auth.verifyToken, DashboardController.fetchImpressions);

router.get("/landmarks",Auth.verifyToken, DashboardController.getLandmarks);

router.get("/site_images/:id",Auth.verifyToken, DashboardController.getSiteImages);

router.get("/sites/areas",Auth.verifyToken, DashboardController.getAreas);

router.get("/sites/unis",Auth.verifyToken, DashboardController.getUNISSiteDetails);

router.get("/sites/available",Auth.verifyToken, DashboardController.getSiteContractDates);

router.get("/sites/booking",Auth.verifyToken, DashboardController.getSiteBookings);

router.post("/sites/booking",Auth.verifyToken, DashboardController.insertSiteBooking);

router.delete("/sites/booking",Auth.verifyToken, DashboardController.deleteBooking);

router.post("/sites/notify",Auth.verifyToken, DashboardController.notifyBooking);

router.post("/sites/available",Auth.verifyToken, DashboardController.updateSiteAvailability);

export const DashboardRoute = router;
