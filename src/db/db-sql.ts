"use strict";

import * as config from "../config/config";
import * as mssql from "mssql";

var db_config = {
  user: config.env.QNE_DB_USER,
  password: config.env.QNE_DB_PASSWORD,
  server: config.env.QNE_DB_HOST,
  database: config.env.QNE_DATABASE,
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
  },
};

export class DBSQLServer {
  constructor() {}

  static async query(sql: string, params: { [key: string]: any } = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      mssql.connect(db_config, (err: any) => {
        if (err) {
          console.error("Database connection error:", err);
          reject(err);
          return;
        }

        // Create Request object
        const request = new mssql.Request();

        // Add parameters to the request
        Object.keys(params).forEach((param) => {
          request.input(param, params[param]);
        });

        // Query the database
        request.query(sql, (err: any, recordset: any) => {
          if (err) {
            console.error("Query execution error:", err);
            reject(err);
            return;
          }
          resolve(recordset);
        });
      });
    });
  }
}
