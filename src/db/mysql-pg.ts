import mysql from "mysql2";

const connection = mysql.createConnection({
  host: "202.57.44.68",
  user: "oamsun",
  password: "Oams@UN",
  database: "oams-un",
});

// Handle connection errors
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to the database: ", err.message);
    // You can handle reconnection logic here if needed, e.g., set a retry mechanism
  } else {
    console.log("Connected to the database");
  }
});

connection.on('error', (err) => {
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error("Database connection lost. Reconnecting...");
    // Attempt to reconnect, e.g., by recreating the connection object
    connection.connect();
  } else {
    console.error("Database error: ", err.message);
  }
});


export class MYSQL {
  constructor() {}

  static query(sql: string, params?: any) {
    return new Promise((resolve, reject) => {
      connection.query(sql, params, (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results);
      });
    });
  }
}
