import express from "express";
import { UserController } from "../controllers/user.controller";
import { Auth, Email } from "../controllers/middleware.controller";
const router = express.Router();

router.get("/test",  UserController.test);

router.get("/",Auth.verifyToken, UserController.getUsers);

router.get("/me", UserController.fetchCookies);

router.get("/companies/:id", Auth.verifyToken, UserController.getCompanyMembers);

router.get("/:id", Auth.verifyToken, UserController.getUser);

router.post("/", Auth.verifyToken, UserController.addUser, Email.send);

router.post("/login", UserController.getAcccessToken);

router.put("/:id",Auth.verifyToken, UserController.updateUser);

router.post("/email-verification",Auth.verifyToken, UserController.emailChecking);

router.patch("/password-change",Auth.verifyToken, UserController.passwordUpdate);


router.post("/logout", UserController.logoutUser);

export const UserRoute = router;
