"use strict";

import * as jwt from "jsonwebtoken";
import * as config from "../config/config";
import bcrypt from "bcrypt";
import { DBPG } from "../db/db-pg";
import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { s3, S3_BUCKET } from "../config/s3";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { readFileSync } from "fs";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { Impression } from "../utils/types";
import { readFile } from "fs/promises";
import path from "path";
import { sendEmail } from "../utils/email";
import { escapeHtml } from "../utils/helper";
export const Auth = {
  getToken: async (
    username: string,
    password: string,
    keepLoggedIn: boolean,
  ) => {
    try {
      //CHECK CREDENTIALS FIRST
      const [cred] = await DBPG.query(
        "SELECT account_id, password FROM user_accounts WHERE username ILIKE $1 OR email_address ILIKE $1;",
        [username],
      );

      if (!cred) {
        throw new Error("Account not found. Please register.");
      }

      const passwordsMatched = await bcrypt.compare(password, cred.password);

      if (!passwordsMatched) {
        throw new Error(
          "You have entered an incorrect password. Please try again.",
        );
      }
      const [account] = await DBPG.query(
        `SELECT
            ui.account_id,
            ui.first_name,
            ui.last_name,
            ua.username,
            ua.email_address,
            ui.phone,
            ui.company_id,
            ui.position,
            ua.role_id,
            ua.status,
            ur.admin,
            ur.client,
            COALESCE(rp.permissions, '[]'::jsonb) AS permissions
        FROM user_accounts ua
        JOIN user_information ui
            ON ua.account_id = ui.account_id
        JOIN user_roles ur
            ON ua.role_id = ur.role_id
        LEFT JOIN (
            SELECT
                r.role_id,
                JSONB_AGG(DISTINCT p.key)
                    FILTER (WHERE p.key IS NOT NULL) AS permissions
            FROM user_roles r
            LEFT JOIN role_permissions rper
                ON r.role_id = rper.role_id
            LEFT JOIN permissions p
                ON rper.permission_key = p.key
            GROUP BY r.role_id
        ) rp
            ON ur.role_id = rp.role_id
        WHERE ua.account_id = $1;`,
        [cred.account_id],
      );

      if (account.status === 0) {
        throw new Error(
          "Your account is terminated. Please contact the administrator",
        );
      }

      const data = JSON.parse(
        JSON.stringify({ ...account, expiresIn: keepLoggedIn ? "30d" : "1d" }),
      );
      const token = jwt.sign(data, config.env.TOKEN_SECRET, {
        expiresIn: keepLoggedIn ? "30d" : "1d",
      });

      return {
        ...account,
        token,
      };
    } catch (err) {
      //throw new Error(err);
      throw err;
    }
  },

  verifyToken: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.headers["x-api-key"];
      if (key) {
        const keys = await DBPG.query("SELECT key FROM api", []);
        const match = keys.some((k: any) =>
          bcrypt.compareSync(key as string, k.key),
        );
        if (!match) {
          return res.status(401).send({ message: "Unauthorized" });
        }
      } else {
        const token = req.cookies.token;
        console.log(req.cookies);
        if (!token) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        const decoded: any = jwt.verify(token, config.env.TOKEN_SECRET);

        if (!decoded) {
          return res.status(401).send({ message: "Session Timeout" });
        }
      }
      next();
    } catch (err) {
      return res.status(401).send({ message: "Session expired" });
    }
  },
};

export const Multer = {
  upload: multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.MAX_FILE_SIZE,
      files: 1,
    },
    fileFilter: (_req, file, callback) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(file.mimetype)) {
        return callback(new Error("Unsupported image type"));
      }

      callback(null, true);
    },
  }),
};

export const AWS = {
  getImageURL: (key: string, expiresIn = 300) => {
    const domain = config.env.AWS_CLOUDFRONT_DOMAIN;
    const keyPairId = config.env.AWS_CLOUDFRONT_PUBLIC_KEY;
    const privateKeyPath = config.env.AWS_CLOUDFRONT_PRIVATE_KEY_PATH;

    const privateKey = readFileSync(privateKeyPath, "utf8");

    return getSignedUrl({
      url: `https://${domain}/${key}`,
      keyPairId,
      privateKey,
      dateLessThan: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });
  },
  getImageMetadata: async (key: string) => {
    return await s3.send(
      new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      }),
    );
  },
  listImages: async (prefix: string = "sites", continuationToken?: string) => {
    return await s3.send(
      new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 100,
      }),
    );
  },
  deleteImage: async (key: string) => {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      }),
    );
  },
};

export const Impressions = {
  getAverage: async (area: string, date_from?: string, date_to?: string) => {
    const [impression]: { impressions: number | null }[] = await DBPG.query(
      `SELECT AVG(impressions) AS impressions
       FROM impressions
       WHERE area = $1
         AND record_at >= COALESCE($2::timestamp, NOW() - INTERVAL '30 days')
         AND record_at <= COALESCE($3::timestamp, NOW());`,
      [area, date_from ?? null, date_to ?? null],
    );

    return impression?.impressions ?? 0;
  },
  getBulkAverage: async (
    areas: string[],
    date_from: string | null,
    date_to: string | null,
  ) => {
    const impressions: {
      area: string;
      impressions: number | null;
    }[] = await DBPG.query(
      `SELECT
       area,
       AVG(impressions) AS impressions
     FROM impressions
     WHERE area = ANY($1::text[])
       AND record_at >= COALESCE($2::timestamp, NOW() - INTERVAL '30 days')
       AND record_at <= COALESCE($3::timestamp, NOW())
     GROUP BY area`,
      [areas, date_from, date_to],
    );

    return impressions;
  },
  getAllAverage: async (area: string) => {
    const [impressions]: { daily: number; weekly: number; monthly: number }[] =
      await DBPG.query("SELECT * FROM get_average_impressions($1);", [area]);
    return {
      daily: Math.ceil(Number(impressions?.daily ?? 0)),
      weekly: Math.ceil(Number(impressions?.weekly ?? 0)),
      monthly: Math.ceil(Number(impressions?.monthly ?? 0)),
    };
  },
  getDaily: async (area: string, date_from?: string, date_to?: string) => {
    const response: Impression[] = await DBPG.query(
      `SELECT TO_CHAR(DATE_TRUNC('day', record_at), 'YYYY-MM-DD') AS period, SUM(impressions)::double precision AS impressions FROM impressions  WHERE area = $1 AND record_at >= COALESCE($2::timestamp, NOW() - INTERVAL '32 days') AND record_at <= COALESCE($3::timestamp, NOW()) GROUP BY DATE_TRUNC('day', record_at) ORDER BY period ASC;`,
      [area, date_from ?? null, date_to ?? null],
    );
    return response;
  },
  getWeekly: async (area: string, date_from?: string, date_to?: string) => {
    const response: Impression[] = await DBPG.query(
      `SELECT TO_CHAR(DATE_TRUNC('week', record_at), 'YYYY-MM-DD') AS period, SUM(impressions)::double precision AS impressions FROM impressions  WHERE area = $1 AND record_at >= COALESCE($2::timestamp, NOW() - INTERVAL '4 week') AND record_at <= COALESCE($3::timestamp, NOW()) GROUP BY DATE_TRUNC('week', record_at) ORDER BY period ASC;`,
      [area, date_from ?? null, date_to ?? null],
    );
    return response;
  },
  getMonthly: async (area: string, date_from?: string, date_to?: string) => {
    const response: Impression[] = await DBPG.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', record_at), 'YYYY-MM-DD') AS period, SUM(impressions)::double precision AS impressions FROM impressions  WHERE area = $1 AND record_at >= COALESCE($2::timestamp, NOW() - INTERVAL '6 months') AND record_at <= COALESCE($3::timestamp, NOW()) GROUP BY DATE_TRUNC('month', record_at) ORDER BY period ASC;`,
      [area, date_from ?? null, date_to ?? null],
    );
    return response;
  },
};
export const Global = {
  updateInfo: async (
    data: Record<string, unknown>,
    table: string,
    field: string,
    id: string,
  ) => {
    let sql = `UPDATE ${table} SET `;

    const conditions = Object.keys(data).map(
      (column, index) => `${column} = $${index + 1}`,
    );
    const params = Object.values(data);

    sql +=
      conditions.join(", ") + ` WHERE ${field} = $${conditions.length + 1}`;

    return await DBPG.query(sql, [...params, id]);
  },
};

export const Email = {
  send: async (_: Request, res: Response) => {
    const { email_payload } = res.locals;

    let html = await readFile(
      path.join(process.cwd(), "templates", "welcome.html"),
      "utf-8",
    );

    const replacements: Record<string, string> = {
      name: email_payload.name,
      password: email_payload.password,
      email_address: email_payload.email_address,
    };

    for (const [key, value] of Object.entries(replacements)) {
      html = html.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, "g"),
        escapeHtml(String(value ?? "")),
      );
    }

    await sendEmail({
      to: email_payload.email_address,
      subject: "Welcome to OOH Incites! Your Trial Access Is Ready",
      html,
    });

    res.status(200).send({
      message: "Welcome email sent successfully.",
    });
  },
};
