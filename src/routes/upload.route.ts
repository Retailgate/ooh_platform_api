import { Router } from "express";
import { createUploadUrl } from "../controllers/upload.controller";
import { Auth } from "../controllers/middleware.controller";
// Import your existing authentication middleware.

const router = Router();

router.post("/presign", Auth.verifyToken, createUploadUrl);

export default router;
