import { Router } from "express";
import {
  getFile,
  getSiteFiles,
  getSiteThumbnail,
  uploadFile,
} from "../controllers/upload.controller";
import { Auth, Multer } from "../controllers/middleware.controller";

const router = Router();

router.get("/sites/thumbnail/:id", Auth.verifyToken, getSiteThumbnail);

router.get("/sites/:id", Auth.verifyToken, getSiteFiles);

router.get("/:id", Auth.verifyToken, getFile);

router.post("/:id", Auth.verifyToken, Multer.upload.single("file"), uploadFile);

export default router;
