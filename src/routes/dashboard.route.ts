import express, { Request, Response } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
const router = express.Router();

//router.get("/test", Auth.verifyToken, UserController.test);

router.get("/sites", DashboardController.getSiteData);

export const DashboardRoute = router;
