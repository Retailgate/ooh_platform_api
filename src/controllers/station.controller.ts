import { Request, Response } from "express";
import { DBSQLServer } from "../db/db-sql";
import { DBPG } from "../db/db-pg";
import { StationInterface } from "./utasi.interface";

export const StationController = {
  async getStations(req: Request, res: Response): Promise<void> {
    const sqlQuery = `
      SELECT * FROM utasi_lrt_stations`;
    try {
      const result = (await DBPG.query(sqlQuery, [])) as StationInterface[];
      res.status(200).json({
        message: "Query successful",
        data: result,
        count: result.length,
      });
    } catch (error) {
      console.error("Database query failed", error);
      res.status(500).json({
        message: "Query failed",
        error: (error as Error).message,
      });
    }
  },

  async getAllStationDetails(req: Request, res: Response): Promise<void> {
    const query = `SELECT s.station_id, s.station_name, s.south_ee, s.north_ee, s.next_south_station, s.next_north_station,
                      JSON_AGG(
                          JSON_BUILD_OBJECT(
                              'asset_id', sorted_assets.id,
                              'asset_name', sorted_assets.asset_name,
                              'asset_distinction', sorted_assets.asset_distinction,
                              'asset_status', sorted_assets.asset_status,
                              'asset_size', sorted_assets.asset_size,
                        'asset_dimension_width', sorted_assets.asset_dimension_width,
                        'asset_dimension_height', sorted_assets.asset_dimension_height
                          )
                      ) FILTER (WHERE sorted_assets.asset_name = 'parapet') AS parapets,
                      JSON_AGG(
                          JSON_BUILD_OBJECT(
                              'asset_id', sorted_assets.id,
                              'asset_name', sorted_assets.asset_name,
                              'asset_distinction', sorted_assets.asset_distinction,
                              'asset_status', sorted_assets.asset_status,
                              'asset_size', sorted_assets.asset_size,
                        'asset_dimension_width', sorted_assets.asset_dimension_width,
                        'asset_dimension_height', sorted_assets.asset_dimension_height
                          )
                      ) FILTER (WHERE sorted_assets.asset_name = 'backlit') AS backlits
                  FROM utasi_lrt_stations s
                   JOIN (
                      SELECT a.id, a.station_id, b.asset_name, a.asset_distinction, a.asset_status, a.asset_size, a.asset_dimension_width, a.asset_dimension_height
                      FROM utasi_lrt_station_assets a
                      INNER JOIN utasi_lrt_assets b ON a.asset_id = b.asset_id
                      ORDER BY a.id ASC 
                  ) sorted_assets ON s.station_id = sorted_assets.station_id
                  GROUP BY s.station_id, s.station_name, s.south_ee, s.north_ee, s.next_south_station, s.next_north_station
                  ORDER BY s.station_id DESC;`;
    try {
      const stations = await DBPG.query(query, []);
      res.status(200).json({
        message: "Query successful",
        data: stations,
      });
    } catch (error) {
      console.error("Database query failed", error);
      res.status(500).json({
        message: "Query failed",
        error: (error as Error).message,
      });
    }
  },

  async getStationSpecs(req: Request, res: Response): Promise<void> {
    const query = `SELECT b.station_id, b.station_name,
                      JSON_AGG(
                          JSONB_BUILD_OBJECT(
                              'asset_name', d.asset_name,
                              'media_rental', c.media_rental,
                              'ratecard', c.ratecard,
                              'prod_cost', c.prod_cost,
                              'min_duration_months', c.min_duration_months,
                              'vat_exclusive', c.vat_exclusive,
                              'stations', c.stations,
                              'size', c.size,
                              'notes', c.notes
                          )
                      ) AS details
                    FROM utasi_lrt_station_specs a
                    JOIN utasi_lrt_stations b ON a.station_id = b.station_id
                    JOIN utasi_lrt_assets_specs c ON a.spec_id = c.spec_id
                    JOIN utasi_lrt_assets d ON c.asset_id = d.asset_id
                    GROUP BY b.station_id, b.station_name
                    ORDER BY b.station_id DESC;`;
    try {
      const result = await DBPG.query(query, []);
      res.status(200).json({
        message: "Query successful",
        data: result,
      });
    } catch (error) {
      console.error("Database query failed", error);
      res.status(500).json({
        message: "Query failed",
        error: (error as Error).message,
      });
    }
  },
  async updateAsset(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { asset_status, asset_size, asset_dimension_width, asset_dimension_height } = req.body;

    try {
      const result = await DBPG.query(
        "UPDATE utasi_lrt_station_assets SET asset_status = $1, asset_size = $2, asset_dimension_width = $3, asset_dimension_height = $4 WHERE id = $5 RETURNING *",
        [asset_status, asset_size, asset_dimension_width, asset_dimension_height, id]
      );

      res.json({
        message: "Parapet updated successfully",
      });
    } catch (error) {
      console.error("Error updating parapet:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  async updateParapetStatus(req: Request, res: Response): Promise<void> {
    try {
      const { station_id, asset_distinction, asset_id, status } = req.body;

      // Validate parameters
      if (!station_id || !asset_distinction || !asset_id || !status) {
        res.status(400).json({ message: "Missing required parameters" });
        return;
      }

      // Determine the correct status change based on the provided status
      let newStatus = "";
      let validPreviousStatus = "";

      if (status === "TAKEN") {
        newStatus = "TAKEN";
        validPreviousStatus = "AVAILABLE";
      } else if (status === "AVAILABLE") {
        newStatus = "AVAILABLE";
        validPreviousStatus = "TAKEN";
      } else {
        res.status(400).json({ message: "Invalid status provided" });
        return;
      }

      const query = `
        UPDATE utasi_lrt_station_assets
        SET asset_status = $1
        WHERE station_id = $2
          AND asset_distinction LIKE $3
          AND asset_status = $4
          AND asset_id = $5
          AND asset_size = 'SMALL'
          AND is_disabled = 0
        RETURNING *;
      `;

      const values = [newStatus, station_id, `${asset_distinction}%`, validPreviousStatus, asset_id];
      const result = await DBPG.query(query, values);

      res.status(200).json({
        message: `Parapet status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating parapet status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
