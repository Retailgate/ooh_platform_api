import express from "express";
import { CompanyController } from "../controllers/company.controller";
import { Auth } from "../controllers/middleware.controller";
const router = express.Router();

router.get("/",Auth.verifyToken, CompanyController.getCompany);

router.post("/",Auth.verifyToken, CompanyController.addCompany);

router.put("/",Auth.verifyToken, CompanyController.updateCompany);

export const CompanyRoute = router;
