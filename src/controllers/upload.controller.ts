import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, S3_BUCKET } from "../config/s3";
import { MAX_FILE_SIZE } from "../config/config";
import { DBPG } from "../db/db-pg";
import { Upload } from "../utils/types";
import { AWS } from "./middleware.controller";
import sharp from "sharp";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const extension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function getSiteFiles(req: Request, res: Response) {
  try {
    const site_id = req.params.id;

    if (!site_id) {
      return res.status(400).json({
        message: "Invalid image ID",
      });
    }

    const images: Upload[] = await DBPG.query(
      `SELECT * FROM uploads WHERE "row_id" = $1 AND "table" = 'sites';`,
      [site_id],
    );

    if (!images || images?.length === 0) {
      return res.status(200).json([]);
    }

    const results = images.map((item) => {
      return {
        ...item,
        url: AWS.getImageURL(item.object_key),
        thumbnail: AWS.getImageURL(item.thumbnail_key),
      };
    });

    res.status(200).send(results);
  } catch (error) {
    console.error("Failed to fetch S3 bucket", error);

    return res.status(500).json({
      message: "Unable to get files",
    });
  }
}
export async function getSiteThumbnail(req: Request, res: Response) {
  try {
    const siteId = Number(req.params.id);

    if (!Number.isSafeInteger(siteId) || siteId <= 0) {
      return res.status(400).json({
        message: "Invalid site ID",
      });
    }

    const images: Upload[] = await DBPG.query(
      `SELECT *
       FROM uploads
       WHERE "row_id" = $1
         AND "table" = 'sites'
       ORDER BY created_at DESC
       LIMIT 1`,
      [siteId],
    );

    if (images.length === 0) {
      return res.status(200).json({
        thumbnail: null,
      });
    }

    const image = images[0];

    return res.status(200).json({
      ...image,
      thumbnail: image.thumbnail_key
        ? AWS.getImageURL(image.thumbnail_key)
        : null,
    });
  } catch (error) {
    console.error("Failed to fetch site thumbnail", error);

    return res.status(500).json({
      message: "Unable to get thumbnail",
    });
  }
}
export async function getFile(req: Request, res: Response) {
  try {
    const upload_id = req.params.id;

    if (!upload_id) {
      return res.status(400).json({
        message: "Invalid image ID",
      });
    }

    const images: Upload[] = await DBPG.query(
      "SELECT * FROM uploads WHERE upload_id = $1",
      [upload_id],
    );

    if (!images) {
      return res.status(400).json({
        message: "Image not found.",
      });
    }
    const image = images[0];

    const url = AWS.getImageURL(image.object_key);
    const thumbnail = AWS.getImageURL(image.thumbnail_key);

    res.status(200).send({
      ...image,
      url,
    });
  } catch (error) {
    console.error("Failed to create S3 upload URL", error);

    return res.status(500).json({
      message: "Unable to prepare upload",
    });
  }
}
export async function uploadFile(req: Request, res: Response) {
  try {
    const file = req.file;
    const prefix = req.query.prefix ?? "sites";
    const siteCode = req.query.site_code;
    const rowId = req.params.id;

    if (!file) {
      return res.status(400).json({
        message: "File is missing.",
      });
    }
    if (!siteCode) {
      return res.status(400).json({
        message: "Site Code is missing. Request could not be completed.",
      });
    }

    const { buffer, mimetype, size, originalname } = file;
    if (!allowedTypes.has(mimetype)) {
      return res.status(400).json({
        message: "Unsupported image type",
      });
    }

    if (!Number.isInteger(size) || size <= 0 || size > MAX_FILE_SIZE) {
      return res.status(400).json({
        message: "Maximum file size is 5 MB",
      });
    }

    const thumbnailBuffer = await sharp(buffer)
      .rotate()
      .resize({
        width: 320,
        height: 240,
        fit: "cover",
        withoutEnlargement: true,
      })
      .webp({ quality: 75 })
      .toBuffer();

    const key = `${prefix}/${siteCode}/${randomUUID()}.${extension[mimetype]}`;
    const thumbnailKey = `${prefix}/${siteCode}/thumbnails/${randomUUID()}.${extension[mimetype]}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        CacheControl: "private, max-age=300",
      }),
    );
    try {
      // Upload the thumbnail.
      await s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: "image/webp",
          CacheControl: "private, max-age=300",
        }),
      );

      const sql = `INSERT INTO uploads ("table", "row_id", "object_key", "original_filename", "content_type", "file_size", "thumbnail_key") VALUES ($1,$2,$3,$4,$5,$6,$7);`;
      const response = await DBPG.query(sql, [
        prefix,
        rowId,
        key,
        originalname,
        mimetype,
        size,
        thumbnailKey,
      ]);

      res.status(200).send({
        response: response,
        success: Boolean(response),
        message: `Image has been successfully uploaded.`,
      });
    } catch (error) {
      await AWS.deleteImage(key);
    }
  } catch (error) {
    console.error("Failed to create S3 upload URL", error);

    return res.status(500).json({
      message: "Unable to prepare upload",
    });
  }
}
