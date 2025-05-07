import { Request, Response } from "express";
import { DBPG } from "../db/db-pg";

export const ExternalController = {
  async getExternalAssetSpecs(req: Request, res: Response): Promise<void> {
    const { asset_id } = req.params;
    try {
      const query = `SELECT a.id, b.spec_id, c.asset_id, c.asset_name AS "asset_type",a.asset_name AS "viaduct_name", a.asset_direction, a.latitude, a.longitude,
                      b.media_rental, b.ratecard, b.prod_cost, b.min_duration_months, 
                      b.vat_exclusive, b.stations, b.size, b.notes, b.created_at FROM utasi_lrt_external_assets a 
                      LEFT JOIN utasi_lrt_assets_specs b ON a.spec_id = b.spec_id
                      JOIN utasi_lrt_assets c ON a.asset_id = c.asset_id
                      WHERE c.asset_id = $1
                      ORDER BY a.id ASC`;
      const result = await DBPG.query(query, [asset_id]);

      res.status(200).json({
        message: "External Assets found",
        data: result,
      });
    } catch (error) {
      console.error("Error getting External Specs:", error);
      res.status(500).json({
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
