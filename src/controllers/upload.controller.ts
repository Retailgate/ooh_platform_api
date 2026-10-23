import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET } from "../config/s3";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function createUploadUrl(req: Request, res: Response) {
  try {
    // Apply your real authentication middleware to this route.
    const { contentType, size } = req.body;

    if (!allowedTypes.has(contentType)) {
      return res.status(400).json({
        message: "Unsupported image type",
      });
    }

    if (!Number.isInteger(size) || size <= 0 || size > 10 * 1024 * 1024) {
      return res.status(400).json({
        message: "Maximum file size is 10 MB",
      });
    }

    // Generate the key on the server, not from user input.
    const key = `images/${randomUUID()}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 300,
      signableHeaders: new Set(["content-type"]),
    });

    return res.json({ uploadUrl, key });
  } catch (error) {
    console.error("Failed to create S3 upload URL", error);

    return res.status(500).json({
      message: "Unable to prepare upload",
    });
  }
}
