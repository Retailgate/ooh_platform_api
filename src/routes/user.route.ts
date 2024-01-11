import express, { Request, Response } from 'express';
import { UserController } from '../controllers/user.controller';
import{ Auth } from '../controllers/middleware.controller';
const router = express.Router();

//router.get("/test", Auth.verifyToken, UserController.test);

router.post("/register", UserController.registerUser);

router.post("/login", UserController.getAcccessToken);

export const UserRoute = router;
