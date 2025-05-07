import mysql from "mysql2";
import { Pool, PoolOptions } from "mysql2";

const pool = mysql.createPool({
  connectionLimit: 10, // Adjust based on load
  host: "202.57.44.68",
  user: "oamsun",
  password: "Oams@UN",
  database: "oams-un",
  waitForConnections: true,
  queueLimit: 0, // Unlimited queue (set a limit if needed)
});
pool.getConnection((err, connection) => {
  if (err) {
    console.error("\u274C Error connecting to MySQL pool:", err.message);
  } else {
    console.log("\u2705 Successfully connected to MySQL pool.");
    connection.release();
  }
});
// Handle pool errors globally
pool.on("error", (err) => {
  console.error("MySQL Pool Error: ", err);
});

// Utility class
export class MYSQL {
  static query(sql: string, params?: any) {
    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          console.error("Database connection error:", err);
          return reject(err);
        }

        connection.query(sql, params, (error, results) => {
          connection.release(); // Release connection back to the pool

          if (error) {
            return reject(error);
          }
          resolve(results);
        });
      });
    });
  }
}
