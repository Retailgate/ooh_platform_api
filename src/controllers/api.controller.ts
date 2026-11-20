import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { DBPG } from "../db/db-pg";
import { getArea } from "../utils/helper";

export const APIController = {
  async test(req: Request, res: Response) {
    res.status(200).send({
      success: true,
    });
  },

  async getAPIKeys(_: Request, res: Response) {
    const resSql = await DBPG.query(
      `SELECT ID, label, date_generated, expiration, status FROM api`,
      [],
    );

    res.status(200).send(resSql);
  },

  async generateKey(_: Request, res: Response) {
    const rawKey = crypto.randomBytes(32).toString("hex");

    res.status(200).send({ key: rawKey });
  },

  async saveKey(req: Request, res: Response) {
    const data = req.body;

    const hash = await bcrypt.hash(data.key, 10);

    const sql = `INSERT INTO "api" ("key", "label", "date_generated","expiration") VALUES ($1,$2,$3,$4)`;

    await DBPG.query(sql, [
      hash,
      data.label,
      data.date_generated,
      data.expiration,
    ]);

    res.status(200).send({
      success: true,
    });
  },

  async disableKey(req: Request, res: Response) {
    const id = req.params.id;

    await DBPG.query("UPDATE api SET status = 0 WHERE id = $1", [id]);

    res.status(200).send({ success: true });
  },

  async deleteKey(req: Request, res: Response) {
    const id = req.params.id;

    await DBPG.query("DELETE FROM api WHERE id = $1", [id]);

    res.status(200).send({ success: true });
  },

  //API-ACCESSED DATA

  async generateImpressions(req: Request, res: Response) {
    const lat = req.query.lat;
    const lng = req.query.lng;

    const nearest = getArea(lat as string, lng as string);
    const resSQL = await DBPG.query(
      `SELECT 
    DATE_TRUNC('month', created_at) AS month,
    SUM(impressions) AS monthly_total_impressions
FROM impressions
WHERE area = $1
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;`,
      [nearest.areaCode],
    );

    res.send({
      area: nearest.areaCode,
      resSQL,
    });
  },
};
