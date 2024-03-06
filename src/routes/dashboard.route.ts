import express, { Request, Response } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
const router = express.Router();

//router.get("/test", Auth.verifyToken, UserController.test);

router.get("/sites", DashboardController.getSiteData);

router.post("/sites", DashboardController.addSite);

router.get("/planning", DashboardController.planning);

export const DashboardRoute = router;
