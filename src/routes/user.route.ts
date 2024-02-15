import express, { Request, Response } from 'express';
import { UserController } from '../controllers/user.controller';
import{ Auth } from '../controllers/middleware.controller';
const router = express.Router();

//router.get("/test", Auth.verifyToken, UserController.test);

router.post("/register", UserController.registerUser);

router.post("/login", UserController.getAcccessToken);

router.get("/roles", UserController.getRole);

router.post("/roles", UserController.addRole);

router.put("/roles", UserController.updateRole);

router.patch("/roles", UserController.updateRoleStatus);

router.delete("/roles", UserController.deleteRole);

router.get("/", UserController.getUser);

router.post("/", UserController.addUser);

router.put("/", UserController.updateUserInfo);

router.patch("/", UserController.updateUserRoleOrStatus);

export const UserRoute = router;
