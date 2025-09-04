import { Request, Response } from "express";
import { DBSQLServer } from "../db/db-sql";
import { DBPG } from "../db/db-pg";
import { StationInterface } from "./utasi.interface";

export const AvailabilityController = {
  async getParapetsAvailability(req: Request, res: Response): Promise<void> {
    const assetId = req.query.assetId || 1;
    const sqlQuery = `
          WITH base_assets AS (
            SELECT a.asset_id, c.asset_name, a.station_id, b.station_name, SUBSTR(a.asset_distinction, 1, 2) AS asset_prefix,
              COUNT(*) FILTER (
                WHERE a.asset_status = 'AVAILABLE'
              ) OVER (PARTITION BY a.asset_id, a.station_id, SUBSTR(a.asset_distinction, 1, 2)) AS available_count
            FROM utasi_lrt_station_assets a
            JOIN utasi_lrt_stations b ON a.station_id = b.station_id
            JOIN utasi_lrt_assets c ON a.asset_id = c.asset_id
            WHERE a.asset_id = $1 
              AND (UPPER(a.asset_distinction) LIKE 'NB%' OR UPPER(a.asset_distinction) LIKE 'SB%'))
          SELECT asset_id, asset_name, station_id, station_name, asset_prefix,
            CASE 
              WHEN available_count = 0 THEN 'Currently Unavailable' 
              ELSE NULL 
            END AS availability_status
          FROM base_assets
          GROUP BY asset_id, asset_name, station_id, station_name, asset_prefix, available_count ORDER BY station_id DESC;
          `;
    try {
      const queryResult = await DBPG.query(sqlQuery, [assetId]);
      const result = {
        rows: queryResult,
        rowCount: queryResult.length,
      };
      res.status(200).json({
        message: "Query successful",
        data: result.rows,
        count: result.rowCount,
      });
    } catch (error) {
      console.error("Database query failed", error);
      res.status(500).json({
        message: "Query failed",
        error: (error as Error).message,
      });
    }
  },
  async getBacklitsAvailability(req: Request, res: Response): Promise<void> {
    const assetId = req.query.assetId || 2;
    const sqlQuery = `
          SELECT a.id, a.asset_id, c.asset_name, a.station_id, b.station_name, a.asset_distinction, a.asset_status, a.brand
            FROM utasi_lrt_station_assets a
            JOIN utasi_lrt_stations b ON a.station_id = b.station_id
            JOIN utasi_lrt_assets c ON a.asset_id = c.asset_id
            WHERE a.asset_id = $1
            GROUP BY a.id, a.asset_id, c.asset_name, a.station_id, b.station_name,  a.asset_distinction
            ORDER BY a.station_id DESC, a.id ASC;`;
    try {
      const queryResult = await DBPG.query(sqlQuery, [assetId]);
      const result = {
        rows: queryResult,
        rowCount: queryResult.length,
      };
      res.status(200).json({
        message: "Query successful",
        data: result.rows,
        count: result.rowCount,
      });
    } catch (error) {
      console.error("Database query failed", error);
      res.status(500).json({
        message: "Query failed",
        error: (error as Error).message,
      });
    }
  },
  async getTicketBoothsAvailability(req: Request, res: Response): Promise<void> {
    const assetId = req.query.assetId || 10;
    const sqlQuery = `
          SELECT a.id, a.asset_id, c.asset_name, a.station_id, b.station_name, CONCAT(a.asset_distinction, ' ',a.remarks) AS asset_distinction, a.asset_status
            FROM utasi_lrt_station_assets a
            JOIN utasi_lrt_stations b ON a.station_id = b.station_id
            JOIN utasi_lrt_assets c ON a.asset_id = c.asset_id
            WHERE a.asset_id = $1
            GROUP BY a.id, a.asset_id, c.asset_name, a.station_id, b.station_name,  a.asset_distinction
            ORDER BY a.station_id DESC, a.id ASC;`;
    try {
      const queryResult = await DBPG.query(sqlQuery, [assetId]);
      const result = {
        rows: queryResult,
        rowCount: queryResult.length,
      };
      res.status(200).json({
        message: "Query successful",
        data: result.rows,
        count: result.rowCount,
      });
    } catch (error) {
      console.error("Database query failed", error);
      res.status(500).json({
        message: "Query failed",
        error: (error as Error).message,
      });
    }
  },
  async getStairsAvailability(req: Request, res: Response): Promise<void> {
    const assetId = req.query.assetId || 11;
    const sqlQuery = `
          SELECT a.id, a.asset_id, c.asset_name, a.station_id, b.station_name, a.asset_distinction, a.asset_status
            FROM utasi_lrt_station_assets a
            JOIN utasi_lrt_stations b ON a.station_id = b.station_id
            JOIN utasi_lrt_assets c ON a.asset_id = c.asset_id
            WHERE a.asset_id = $1
            GROUP BY a.id, a.asset_id, c.asset_name, a.station_id, b.station_name,  a.asset_distinction
            ORDER BY a.station_id DESC, a.id ASC;`;
    try {
      const queryResult = await DBPG.query(sqlQuery, [assetId]);
      const result = {
        rows: queryResult,
        rowCount: queryResult.length,
      };
      res.status(200).json({
        message: "Query successful",
        data: result.rows,
        count: result.rowCount,
      });
    } catch (error) {
      console.error("Database query failed", error);
      res.status(500).json({
        message: "Query failed",
        error: (error as Error).message,
      });
    }
  },
};
