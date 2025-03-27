import express, { Request, Response } from "express";
import { UserController } from "../controllers/user.controller";
import { Auth } from "../controllers/middleware.controller";
const router = express.Router();

//router.get("/test",  UserController.test);

router.post("/register", UserController.registerUser);

router.post("/login", UserController.getAcccessToken);

router.get("/roles", UserController.getRole);

router.get("/ae", UserController.getAccountExecutives);

router.post("/roles", UserController.addRole);

router.put("/roles", UserController.updateRole);

router.patch("/roles", UserController.updateRoleStatus);

router.delete("/roles", UserController.deleteRole);

router.get("/modules", UserController.getModules);

router.post("/modules", UserController.addModule);

router.put("/modules", UserController.toggleModule);

router.get("/", UserController.getUser);

router.post("/", UserController.addUser);

router.put("/", UserController.updateUserInfo);

router.patch("/", UserController.updateUserRoleOrStatus);

router.post("/email-verification", UserController.emailChecking);

router.patch("/password-change", UserController.passwordUpdate);

export const UserRoute = router;
