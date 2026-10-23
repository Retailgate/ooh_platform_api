import * as config from "./src/config/config";
import * as fs from "fs";
import * as https from "https";
import cors from "cors";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { UserRoute } from "./src/routes/user.route";
import { DashboardRoute } from "./src/routes/dashboard.route";
import { APIRoute } from "./src/routes/api.route";
import { CompanyRoute } from "./src/routes/company.route";
import { SitesRoute } from "./src/routes/sites.route";
import { MiscRoute } from "./src/routes/misc.route";
import UploadRoute from "./src/routes/upload.route";

const app = express();

const allowedOrigins = [
  "http://localhost:1021",
  "http://localhost:1022",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3001",
  "https://ooh.scmiph.com",
  "https://ooh-ad.scmiph.com",
];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.text());
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use("/user", UserRoute);
app.use("/sites", SitesRoute);
app.use("/dashboard", DashboardRoute);
app.use("/api", APIRoute);
app.use("/company", CompanyRoute);
app.use("/misc", MiscRoute);
app.use("/uploads", UploadRoute);

app.get("/", (req, res) => {
  res.send("OOH Incites API Server is online.");
});

if (config.env.MODE === "DEV") {
  app.listen(config.env.PORT, () => {
    console.log(`Example app listening at http://localhost:${config.env.PORT}`);
  });

} else {
  const privateKey = fs.readFileSync('/etc/letsencrypt/live/oohbu.unmg.com.ph/privkey.pem', 'utf8');
  const certificate = fs.readFileSync('/etc/letsencrypt/live/oohbu.unmg.com.ph/cert.pem', 'utf8');
  const credentials = {
    key: privateKey,
    cert: certificate,
  };
  const httpsServer = https.createServer(credentials, app);
  httpsServer.listen(config.env.PORT, () => {
    console.log(`App listening at https://oohbu.unmg.com.ph:${config.env.PORT}`)
  })
}
