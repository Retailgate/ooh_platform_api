import express from "express";
import { UserController } from "../controllers/user.controller";
import { Auth } from "../controllers/middleware.controller";
const router = express.Router();

router.get("/test",  UserController.test);

router.post("/register", UserController.registerAccount);

router.post("/login", UserController.getAcccessToken);

router.get("/roles",Auth.verifyToken, UserController.getRole);

router.post("/roles",Auth.verifyToken, UserController.addRole);

router.put("/roles",Auth.verifyToken, UserController.updateRole);

router.patch("/roles",Auth.verifyToken, UserController.updateRoleStatus);

router.delete("/roles",Auth.verifyToken, UserController.deleteRole);

router.get("/modules",Auth.verifyToken, UserController.getModules);

router.get("/modules/:id",Auth.verifyToken, UserController.getModules);

router.post("/modules",Auth.verifyToken, UserController.addModule);

router.put("/modules",Auth.verifyToken, UserController.toggleModule);

router.get("/",Auth.verifyToken, UserController.getUser);

router.post("/",Auth.verifyToken, UserController.addUser);

router.put("/",Auth.verifyToken, UserController.updateUserInfo);

router.patch("/",Auth.verifyToken, UserController.updateUserRoleOrStatus);

router.post("/email-verification",Auth.verifyToken, UserController.emailChecking);

router.patch("/password-change",Auth.verifyToken, UserController.passwordUpdate);

router.get("/me", UserController.fetchCookies);

router.post("/logout", UserController.logoutUser);

export const UserRoute = router;
