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
  async addViaductAssetAndSpecs(req: Request, res: Response): Promise<void> {
    try {
      const {
        asset_id = 8,
        asset_name,
        asset_direction,
        media_rental,
        prod_cost,
        min_duration_months = 3,
        vat_exclusive,
        size,
      } = req.body;

      const query2 = `INSERT INTO utasi_lrt_assets_specs 
                    (asset_id, media_rental, prod_cost, min_duration_months, vat_exclusive, size)
                    VALUES ($1, $2, $3, $4, $5, $6) RETURNING spec_id`;

      const result2 = await DBPG.query(query2, [
        asset_id,
        media_rental,
        prod_cost,
        min_duration_months,
        vat_exclusive,
        size,
      ]);

      const spec_id = result2[0].spec_id;

      const query = `INSERT INTO utasi_lrt_external_assets 
                   (asset_id, asset_name, asset_direction, spec_id)
                   VALUES ($1, $2, $3, $4) RETURNING *`;

      const result = await DBPG.query(query, [asset_id, asset_name, asset_direction, spec_id]);

      res.status(201).json(result[0]);
    } catch (error) {
      console.error("Error adding viaduct asset and specs:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  async deleteViaductAssetAndSpecs(req: Request, res: Response): Promise<void> {
    try {
      const { id, spec_id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Viaduct ID is required" });
        return;
      }

      // Delete from viaduct table
      const deleteViaductQuery = `DELETE FROM utasi_lrt_external_assets WHERE id = $1`;
      await DBPG.query(deleteViaductQuery, [id]);

      // Conditionally delete from specs if spec_id is provided and not 'null'
      if (spec_id && spec_id !== "null") {
        const deleteSpecQuery = `DELETE FROM utasi_lrt_assets_specs WHERE spec_id = $1`;
        await DBPG.query(deleteSpecQuery, [spec_id]);
      }

      res.status(200).json({ message: "Viaduct (and spec if applicable) deleted successfully" });
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
