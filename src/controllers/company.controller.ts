import { Request, Response } from "express";
import { DBPG } from "../db/db-pg";
import { Global } from "./middleware.controller";

export const CompanyController = {
  async test(req: Request, res: Response) {
    res.status(200).send({ response: "You're in!" });
  },

  async getCompanies(req: Request, res: Response) {
    let sql = `SELECT * FROM companies WHERE status = true`;
    const results = await DBPG.query(sql, []);

    res.status(200).send(results);
  },
  // Get list of users or Get user by ID
  async getCompany(req: Request, res: Response) {
    const id = req.params.id;

    if (!id) {
      throw new Error("ID is missing.");
    }

    const company = await DBPG.query(
      `SELECT * FROM companies WHERE company_id = $1 AND status = true`,
      [id],
    );

    res.status(200).send(company[0]);
  },

  // Create new user
  async addCompany(req: Request, res: Response) {
    const data = req.body;
    if (!data) {
      res.status(400).send("No data to insert.");
    }

    const [response] = await DBPG.query(
      "INSERT INTO companies (name, code, email_address, address, telephone) VALUES ($1,$2,$3,$4,$5) RETURNING company_id",
      [data.name, data.code, data.email_address, data.address, data.telephone],
    );

    res.status(200).send({
      response: response?.company_id,
      success: true,
      message: "Company has been registered.",
    });
  },

  // Update user details
  async updateCompany(req: Request, res: Response) {
    const id = req.params.id;
    const { data } = req.body;
    if (!data) {
      res.status(400).send("No fields to update");
    }

    const response = Global.updateInfo(data, "companies", "company_id", id);

    res.status(200).send({
      response,
      success: true,
      message: "Company information updated succesfully.",
    });
  },
};
