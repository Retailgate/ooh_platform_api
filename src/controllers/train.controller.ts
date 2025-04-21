import { Request, Response } from "express";
import { DBPG } from "../db/db-pg";

export const TrainController = {
  async getTrainAssets(req: Request, res: Response): Promise<void> {
    try {
      const query = `SELECT a.id, b.asset_id, b.asset_name, a.available, a.out_of_order, a.booked FROM utasi_lrt_train_assets a JOIN utasi_lrt_assets b ON a.asset_id = b.asset_id ORDER BY a.id ASC`;
      const result = await DBPG.query(query, []);

      res.status(200).json({
        message: "Train Assets found",
        data: result,
      });
    } catch (error) {
      console.error("Error getting Train Assets:", error);
      res.status(500).json({
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  async getTrainAssetSpecs(req: Request, res: Response): Promise<void> {
    try {
      const query = `SELECT a.asset_id, a.asset_name, b.media_rental, b.ratecard, b.prod_cost,b.min_duration_months,b.vat_exclusive,b.stations,b.size,b.notes
        FROM utasi_lrt_assets a JOIN utasi_lrt_assets_specs b ON b.asset_id = a.asset_id 
        WHERE a.asset_id IN (3,4,5,6,7)
        ORDER BY a.asset_id ASC`;
      const result = await DBPG.query(query, []);

      res.status(200).json({
        message: "Train Assets found",
        data: result,
      });
    } catch (error) {
      console.error("Error getting Train Specs:", error);
      res.status(500).json({
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  

  async bookTrainAsset(req: Request, res: Response): Promise<void> {
    const { qty } = req.body;
    const { id } = req.params;

    try {
      const query = `
            UPDATE utasi_lrt_train_assets
            SET available = available - $1, booked = booked + $1
            WHERE asset_id = $2 AND available >= $1
            RETURNING *;
        `;
      const values = [qty, id];
      const result = await DBPG.query(query, values);

      if (result.length > 0) {
        res.status(200).json({ message: "Booking successful", data: result[0] });
      } else {
        res.status(400).json({ message: "Not enough available assets" });
      }
    } catch (error) {
      console.error("Error booking train asset:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  async updateTrainAsset(req: Request, res: Response): Promise<void> {
    const { avlbl, ood } = req.body;
    const { id } = req.params;

    try {
      const query = `
            UPDATE utasi_lrt_train_assets
            SET available = $1, out_of_order = $2
            WHERE asset_id = $3
            RETURNING *;
        `;
      const values = [avlbl, ood, id];
      const result = await DBPG.query(query, values);

      if (result.length > 0) {
        res.status(200).json({ message: "Update successful", data: result[0] });
      } else {
        res.status(400).json({ message: "No asset updated" });
      }
    } catch (error) {
      console.error("Error updating train asset:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
