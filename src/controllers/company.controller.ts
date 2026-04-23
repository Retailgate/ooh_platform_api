import { Request, Response } from "express";
import * as uuid from "uuid";
import { DBPG } from "../db/db-pg";
import crypto from "crypto";

export const CompanyController = {
  async test(req: Request, res: Response) {
    res.status(200).send({ response: "You're in!" });
  },

  // Get list of users or Get user by ID
  async getCompany(req: Request, res: Response) {
    const id = req.query.id;
    let params = [];

    let sql = `SELECT * FROM companies`;

    if (id) {
      sql += ` WHERE company_id = $1`;
      params.push(id);
    }

    const company = await DBPG.query(sql, params);

    res.status(200).send(!id ? company : company[0]);
  },

  // Create new user
  async addCompany(req: Request, res: Response) {},

  // Update user details
  async updateCompany(req: Request, res: Response) {},
};
