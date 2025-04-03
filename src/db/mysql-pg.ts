import mysql from "mysql2";
import { Pool, PoolOptions } from "mysql2";

// Create a pool with 10 connections (default)
const pool: Pool = mysql.createPool({
  host: process.env.DB_HOST || "202.57.44.68",
  user: process.env.DB_USER || "isti",
  password: process.env.DB_PASS || "isti@UN",
  database: process.env.DB_NAME || "oams-un",
} as PoolOptions);

pool.getConnection((err, connection) => {
  if (err) {
    console.error("\u274C Error connecting to MySQL pool:", err.message);
  } else {
    console.log("\u2705 Successfully connected to MySQL pool.");
    connection.release();
  }
});

export class MYSQL {
  static query<T = any>(sql: string, params?: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
      pool.query(sql, params, (error, results) => {
        if (error) {
          console.error("\u274C Query Error:", error.message);
          return reject(error);
        }
        resolve(results as T);
      });
    });
  }
}

// Graceful Shutdown
process.on("SIGINT", () => {
  console.log("\u2699\uFE0F Closing MySQL pool...");
  pool.end((err) => {
    if (err) {
      console.error("\u274C Error during pool shutdown:", err.message);
    } else {
      console.log("\uD83D\uDEAB MySQL pool closed.");
    }
    process.exit(err ? 1 : 0);
  });
});
