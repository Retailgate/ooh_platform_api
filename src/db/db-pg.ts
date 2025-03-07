import * as config from "../config/config";
import pg_format from "pg-format";
import { Pool, QueryResult } from "pg";

const pool = new Pool({
  host: config.env.PG_HOST,
  port: 5432,
  database: config.env.PG_DATABASE,
  user: config.env.PG_DB_USER,
  password: config.env.PG_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 5000, // Timeout for connection attempts
});

async function executeQuery(queryText: string, params: any[]): Promise<any[]> {
  try {
    const res: QueryResult = await pool.query(queryText, params);
    return res.rows;
  } catch (err) {
    console.error("Query failed:", err);
    throw err;  // Reject the promise for the caller to handle the error
  }
}

function handleDisconnect(): void {
  pool.connect().then(() => {
    console.log("connected to PostgreSQL");
  }).catch((err) => {
    console.error("Connection error", err.stack);
    setTimeout(handleDisconnect, 5000);  // Retry after 5 seconds
  });

  pool.on("error", (err) => {
    console.error("Unexpected database error:", err.stack);
    handleDisconnect();
  });
}

handleDisconnect();

export class DBPG {
  constructor() {}

  static async query(sql: string, params: any[]): Promise<any[]> {
    return await executeQuery(sql, params);
  }

  static async multiInsert(sql: string, params: any[]): Promise<any[]> {
    const query = pg_format(sql, params);
    return await executeQuery(query, []);
  }

  static async multiQuery(queries: { id: string, text: string, values: any[] }[]): Promise<{ [key: string]: any[] }> {
    try {
      const results = await Promise.all(
        queries.map((item) =>
          pool.query({
            text: item.text,
            values: item.values,
          }).then((res) => ({ id: item.id, result: res.rows }))
        )
      );

      return results.reduce((acc, { id, result }) => {
        acc[id] = result;
        return acc;
      }, {} as { [key: string]: any[] });
    } catch (err) {
      console.error("Multi-query failed:", err);
      throw err;
    }
  }

  // Optionally close the pool connection gracefully
  static close(): void {
    pool.end().then(() => {
      console.log("Database connection pool closed");
    }).catch((err) => {
      console.error("Error closing connection pool:", err);
    });
  }
}
