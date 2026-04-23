"use strict";

//import{ DB } from '../db/db';

import * as jwt from "jsonwebtoken";
import * as SqlString from "sqlstring";
// get config vars
import * as config from "../config/config";
import bcrypt from "bcrypt";
import { DBPG } from "../db/db-pg";
import { NextFunction, Request, Response } from "express";

// access config var
//process.env.TOKEN_SECRET;

//module.exports = {
export const Auth = {
  getToken: async (
    username: string,
    password: string,
    keepLoggedIn: boolean,
  ) => {
    try {
      //CHECK CREDENTIALS FIRST
      const [cred] = await DBPG.query(
        "SELECT account_id, password FROM user_accounts WHERE username = $1 OR email_address = $1;",
        [username],
      );

      if (!cred) {
        throw new Error("Account not found. Please register.");
      }

      const passwordsMatched = await bcrypt.compare(password, cred.password);

      if (!passwordsMatched) {
        throw new Error(
          "You have entered an incorrect password. Please try again.",
        );
      }
      const [account] = await DBPG.query(
        `SELECT ui.account_id, ui.first_name, ui.last_name, ua.username, ua.email_address, ui.phone, ui.company_id, ui.position, ua.role_id, ua.status, ur.admin
        FROM user_accounts ua 
        JOIN user_information ui ON ua.account_id = ui.account_id
		    JOIN user_roles ur ON ua.role_id = ur.role_id
        WHERE ua.account_id = $1;`,
        [cred.account_id],
      );

      if (account.status === 0) {
        throw new Error(
          "Your account is terminated. Please contact the administrator",
        );
      }

      const data = JSON.parse(
        JSON.stringify({ ...account, expiresIn: keepLoggedIn ? "30d" : "1d" }),
      );
      const token = jwt.sign(data, config.env.TOKEN_SECRET, {
        expiresIn: keepLoggedIn ? "30d" : "1d",
      });

      return {
        ...account,
        token,
      };
    } catch (err) {
      //throw new Error(err);
      throw err;
    }
  },

  verifyToken: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.headers["x-api-key"];
      if (key) {
        const keys = await DBPG.query("SELECT key FROM api", []);
        const match = keys.some((k: any) =>
          bcrypt.compareSync(key as string, k.key),
        );
        if (!match) {
          return res.status(401).send({ message: "Unauthorized" });
        }
      } else {
        const token = req.cookies.token;
        if (!token) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        const decoded: any = jwt.verify(token, config.env.TOKEN_SECRET);

        if (!decoded) {
          return res.status(401).send({ message: "Session Timeout" });
        }
      }
      next();
    } catch (err) {
      return res.status(401).send({ message: "Session expired" });
    }
  },
};
