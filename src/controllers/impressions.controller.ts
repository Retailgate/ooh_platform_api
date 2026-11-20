import { Request, Response } from "express";
import { DBPG } from "../db/db-pg";
import { Impressions } from "./middleware.controller";

type ImpressionPeriod = "daily" | "weekly" | "monthly";

export const ImpressionsController = {
  async test(_: Request, res: Response) {
    res.status(200).send({
      success: true,
    });
  },
  async getImpressionTrends(req: Request, res: Response) {
    try {
      const { site_code, from, to, period = "daily" } = req.query;

      if (typeof site_code !== "string" || !site_code.trim()) {
        return res.status(400).json({
          message: "Site code is missing.",
        });
      }

      const methods = {
        daily: Impressions.getDaily,
        weekly: Impressions.getWeekly,
        monthly: Impressions.getMonthly,
      } satisfies Record<ImpressionPeriod, typeof Impressions.getDaily>;

      if (typeof period !== "string" || !(period in methods)) {
        return res.status(400).json({
          message: "Invalid period. Use daily, weekly, or monthly.",
        });
      }

      const [site]: { area: string }[] = await DBPG.query(
        "SELECT area FROM sites WHERE site_code = $1",
        [site_code],
      );

      if (!site) {
        return res.status(404).json({
          message: "Site not found.",
        });
      }

      const getTrends = methods[period as ImpressionPeriod];

      const response = await getTrends(
        site.area,
        typeof from === "string" ? from : undefined,
        typeof to === "string" ? to : undefined,
      );

      return res.status(200).json(response);
    } catch (error) {
      console.error("Failed to fetch impression trends:", error);

      return res.status(500).json({
        message: "Failed to fetch impression trends.",
      });
    }
  },
};
