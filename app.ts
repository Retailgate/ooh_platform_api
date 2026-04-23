import * as config from "./src/config/config";
import cors from "cors";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cluster from "cluster";
import { UserRoute } from "./src/routes/user.route";
import { DashboardRoute } from "./src/routes/dashboard.route";
import { APIRoute } from "./src/routes/api.route";
import { CompanyRoute } from "./src/routes/company.route";
import * as fs from "fs";
import * as https from "https";

const numCPUs = require("os").cpus().length;
const app = express();

// const privateKey = fs.readFileSync('/etc/letsencrypt/live/ooh.unmg.com.ph/privkey.pem', 'utf8');
// const certificate = fs.readFileSync('/etc/letsencrypt/live/ooh.unmg.com.ph/cert.pem', 'utf8');
// const ca = fs.readFileSync('/etc/letsencrypt/live/ooh.unmg.com.ph/chain.pem', 'utf8');

// const credentials = {
//   key: privateKey,
//   cert: certificate,
//   ca: ca
// };

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3001",
  "https://ooh.scmiph.com",
  "https://ooh-ad.scmiph.com",
];

if (cluster.isMaster) {
  //console.log(`Master ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("online", function (worker) {
    //console.log('Worker ' + worker.process.pid + ' is online');
  });
  cluster.on("exit", (worker, code, signal) => {
    //console.log(`worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.text());
  app.use(express.json());
  app.use(cookieParser());
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
  app.use("/user", UserRoute);
  app.use("/dashboard", DashboardRoute);
  app.use("/api", APIRoute);
  app.use("/company", CompanyRoute);

  app.get("/", (req, res) => {
    res.send("OOH Incites API Server is online.");
  });

  // const httpsServer = https.createServer(credentials, app);
  // httpsServer.listen(config.env.PORT, () => {
  //   console.log(`App listening at http://localhost:${config.env.PORT}`)
  // })

  app.listen(config.env.PORT, () => {
    console.log(`Example app listening at http://localhost:${config.env.PORT}`);
  });
}
