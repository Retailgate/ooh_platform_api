import { Request, Response } from "express";
import { DBPG } from "../db/db-pg";
import { SiteForm } from "../utils/types";
import { getArea } from "../utils/helper";
import { Impressions } from "./middleware.controller";

export const SitesController = {
  async test(_: Request, res: Response) {
    res.status(200).send({
      success: true,
    });
  },
  async getSites(_: Request, res: Response) {
    const response = await DBPG.query(
      `
      SELECT
        s.*,
        AVG(i.impressions) AS average_impressions
      FROM sites s
      LEFT JOIN impressions i
        ON i.area = s.area
        AND i.record_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      GROUP BY s.site_id
      ORDER BY s.site_id
    `,
      [],
    );

    res.status(200).send(response);
  },
  async getSite(req: Request, res: Response) {
    const id = req.params.id;
    if (!id) throw new Error("ID is missing.");

    const [response]: SiteForm[] = await DBPG.query(
      "SELECT * FROM sites WHERE site_id::varchar = $1 OR site_code = $1 LIMIT 1",
      [id],
    );

    if (!response) {
      res.status(400).send({
        message: "Site not found.",
      });
    }

    const impressions = await Impressions.getAllAverage(response.area as string);
    res.status(200).send({
      ...response,
      impressions,
    });
  },
  async addSite(req: Request, res: Response) {
    const data = req.body as SiteForm;

    if (!data) {
      res.status(400).send("Site data is missing.");
    }
    // Generate the Site Code
    const sql = `INSERT INTO sites("site_code", "area", "region", "latitude", "longitude", "board_facing", "bound", "city", "size", "srp", "ideal_view", "address", "type", "company_id", "traffic_count", "vicinity_population")
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);`;
    const area = getArea(data.latitude, data.longitude);

    const response = await DBPG.query(sql, [
      data.site_code,
      area.areaCode,
      data.region,
      data.latitude,
      data.longitude,
      data.board_facing,
      data.bound,
      data.city,
      data.size,
      data.srp,
      data.ideal_view,
      data.address,
      data.type,
      data.company_id,
      data.traffic_count,
      data.vicinity_population,
    ]);
    res.status(200).send({
      response: response,
      success: Boolean(response),
      message: `${data.site_code} has been successfully uploaded.`,
    });
  },
  async addMultipleSites(req: Request, res: Response) {
    const sites = req.body as SiteForm[];

    if (!sites) {
      res.status(400).send("Site data is missing.");
    }

    const rows = sites.map((row) => {
      const area = getArea(row.latitude, row.longitude);
      return {
        ...row,
        area: area.areaCode,
      };
    });
    const sortedRows = rows.map((row) => [
      row.site_code,
      row.area,
      row.region,
      row.latitude,
      row.longitude,
      row.board_facing,
      row.bound,
      row.city,
      row.size,
      row.srp,
      row.ideal_view,
      row.address,
      row.type,
      row.company_id,
      row.traffic_count,
      row.vicinity_population,
    ]);

    // Generate the Site Code
    const sql = `INSERT INTO sites("site_code", "area", "region", "latitude", "longitude", "board_facing", "bound", "city", "size", "srp", "ideal_view", "address", "type", "company_id", "traffic_count", "vicinity_population") VALUES %L;`;

    const response = await DBPG.multiInsert(sql, sortedRows);
    res.status(200).send({
      response: response,
      success: Boolean(response),
      message: `${sortedRows.length} rows of sites has been successfully uploaded.`,
    });
  },
  async updateSite(req: Request, res: Response) {},
  async manageSite(req: Request, res: Response) {},
  async deleteSite(req: Request, res: Response) {},
};
