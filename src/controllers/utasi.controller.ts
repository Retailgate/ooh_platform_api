import { Request, Response } from "express";
import { DBSQLServer } from "../db/db-sql";
import { DBPG } from "../db/db-pg";
import { StationInterface } from "./utasi.interface";

export const UTASIController = {
  async getContracts(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const sqlQuery = `
      WITH CTE AS (
        SELECT 
            A.SalesOrderCode, A.ReferenceNo, A.SalesOrderDate, A.DebtorName,
            A.TotalAmount, A.TaxTotalAmount, A.NetTotalAmount,
            A.IsCancelled, A.IsClosed,
            A.ProjectId, C.ProjectCode, C.[Description] AS ProjectDesc,
            B.StockId, B.[Description] AS cDesc, 
            CASE 
                WHEN D.StockName IN ('LRT', 'LRT-ZR') THEN 'LRT'
                WHEN D.StockName IN ('PITX', 'PITX - ZR') THEN 'PITX'
                WHEN D.StockName IN ('MCIA', 'MCIA - ZR') THEN 'MCIA'
                ELSE D.StockName
            END AS StockName,
            D.[Description] AS StockDesc,
            B.Qty, B.unitprice, B.Amount, B.TaxAmount, B.NetAmount,
            MIN(B.DateRef1) OVER(PARTITION BY B.salesorderID) AS DateRef1,
            MAX(B.DateRef2) OVER(PARTITION BY B.salesorderID) AS DateRef2,
            CASE 
                WHEN GETDATE() BETWEEN 
                    MIN(B.DateRef1) OVER(PARTITION BY B.salesorderID) AND 
                    MAX(B.DateRef2) OVER(PARTITION BY B.salesorderID) 
                THEN 1 ELSE 0 
            END AS isActive,
            ROW_NUMBER() OVER (PARTITION BY B.salesorderID ORDER BY B.salesorderID) AS RowNum
        FROM SalesOrders A
            INNER JOIN SalesOrderDetails B ON A.id = B.SalesOrderId
            LEFT OUTER JOIN Projects C ON A.ProjectId = C.Id
            INNER JOIN Stocks D ON B.StockId = D.Id
        WHERE A.IsClosed = 0 AND D.StockName IN ('LRT', 'LRT-ZR') 
      )
      SELECT 
          SalesOrderCode, ReferenceNo, SalesOrderDate, DebtorName,
          TotalAmount, TaxTotalAmount, NetTotalAmount,
          IsCancelled, IsClosed,
          ProjectId, ProjectCode, ProjectDesc,
          StockId, cDesc, StockName, StockDesc,
          Qty, unitprice, Amount, TaxAmount, NetAmount,
          DateRef1, DateRef2, isActive
      FROM CTE
      WHERE RowNum = 1 AND isActive = 1
      ORDER BY SalesOrderCode ASC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
  
      -- Get total count for pagination
      WITH CountCTE AS (
        SELECT 
            ROW_NUMBER() OVER (PARTITION BY B.salesorderID ORDER BY B.salesorderID) AS RowNum,
            CASE 
                WHEN GETDATE() BETWEEN 
                    MIN(B.DateRef1) OVER(PARTITION BY B.salesorderID) AND 
                    MAX(B.DateRef2) OVER(PARTITION BY B.salesorderID) 
                THEN 1 ELSE 0 
            END AS isActive
        FROM SalesOrders A
            INNER JOIN SalesOrderDetails B ON A.id = B.SalesOrderId
            INNER JOIN Stocks D ON B.StockId = D.Id
        WHERE A.IsClosed = 0 AND D.StockName IN ('LRT', 'LRT-ZR') 
      )
      SELECT COUNT(*) AS TotalCount
      FROM CountCTE
      WHERE RowNum = 1 AND isActive = 1;
    `;

    try {
      const result = await DBSQLServer.query(sqlQuery);

      // SQL Server returns multiple result sets: [0] = data, [1] = count
      const contracts = result.recordsets[0];
      const totalCount = result.recordsets[1]?.[0]?.TotalCount || 0;

      res.status(200).json({
        message: "Yeet successful",
        data: contracts,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        message: "Yeet failed",
        error: (error as Error).message,
      });
    }
  },

  async attachContract(req: Request, res: Response): Promise<void> {
    try {
      const {
        assetSalesOrderCode,
        assetDateStart,
        assetDateEnd,
        stationId,
        assetId,
        assetFacing,
        backlitId,
        quantity,
        viaductId,
        pillarId
      } = req.body;

      const insertQuery = `
        INSERT INTO utasi_lrt_contracts (asset_sales_order_code, asset_date_start, asset_date_end, station_id, asset_id, asset_facing, backlit_id, quantity, viaduct_id, pillar_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;
      `;

      const insertValues = [
        assetSalesOrderCode,
        assetDateStart,
        assetDateEnd,
        stationId,
        assetId,
        assetFacing,
        backlitId,
        quantity,
        viaductId,
        pillarId
      ];
      const insertResult = await DBPG.query(insertQuery, insertValues);

      res.status(201).json({
        message: "Contract attached successfully",
        contract: insertResult,
      });
    } catch (error) {
      console.error("Error attaching contract:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  async getContractFromAsset(req: Request, res: Response): Promise<void> {
    try {
      const query = `SELECT b.asset_name, a.* FROM utasi_lrt_contracts a JOIN utasi_lrt_assets b ON b.asset_id = a.asset_id
                      ORDER BY contract_id ASC`;
      const result = await DBPG.query(query, []);
      res.status(200).json({
        message: "Contract found",
        data: result,
      });
    } catch (error) {
      console.error("Error getting contract:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  async untagContract(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ message: "Contract ID is required" });
        return;
      }
      const query = `DELETE FROM utasi_lrt_contracts WHERE contract_id = $1`;
      const result = await DBPG.query(query, [id]);
      res.status(200).json({ message: "Contract deleted successfully" });
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
