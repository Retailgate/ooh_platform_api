import express from "express";
import { Auth } from "../controllers/middleware.controller";
import { SitesController } from "../controllers/sites.controller";
const router = express.Router();

router.get("/test", SitesController.test);

router.get("/", Auth.verifyToken, SitesController.getSites);

router.get("/:id", Auth.verifyToken, SitesController.getSite);

router.post("/", Auth.verifyToken, SitesController.addSite);

router.post("/batch", Auth.verifyToken, SitesController.addMultipleSites);

router.put("/:id", Auth.verifyToken, SitesController.updateSite);

router.patch("/:id", Auth.verifyToken, SitesController.manageSite);

router.delete("/:id", Auth.verifyToken, SitesController.deleteSite);

export const SitesRoute = router;
