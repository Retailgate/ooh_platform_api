import express, { Request, Response } from 'express';
import { UserController } from '../controllers/user.controller';
import{ Auth } from '../controllers/middleware.controller';
const router = express.Router();

//router.get("/test", Auth.verifyToken, UserController.test);

router.post("/register", UserController.registerUser);

router.post("/login", UserController.getAcccessToken);

router.get("/roles", Auth.verifyToken, UserController.getRole);

router.post("/roles", Auth.verifyToken, UserController.addRole);

router.put("/roles", Auth.verifyToken, UserController.updateRole);

router.patch("/roles", Auth.verifyToken, UserController.updateRoleStatus);

router.delete("/roles", Auth.verifyToken, UserController.deleteRole);

router.get("/", Auth.verifyToken, UserController.getUser);

router.post("/", Auth.verifyToken, UserController.addUser);

router.put("/", Auth.verifyToken, UserController.updateUserInfo);

router.patch("/", Auth.verifyToken, UserController.updateUserRoleOrStatus);

router.post("/email-verification", UserController.emailChecking);

router.patch("/password-change", UserController.passwordUpdate);

export const UserRoute = router;
