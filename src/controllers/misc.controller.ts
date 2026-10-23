import { Request, Response } from "express";
import { DBPG } from "../db/db-pg";

export const MiscController = {
  async test(req: Request, res: Response) {
    res.status(200).send({
      success: true,
    });
  },
  async getTypes(_: Request, res: Response) {
    const response = await DBPG.query("SELECT * FROM types;", []);
    res.status(200).send(response);
  },
};
