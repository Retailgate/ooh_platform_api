import { Request, Response } from "express";
import { DBPG } from "../db/db-pg";

export const SitesController = {
  async test(req: Request, res: Response) {
    res.status(200).send({
      success: true,
    });
  },
  async getSites(req: Request, res: Response) {
    const response = await DBPG.query("SELECT * FROM sites", []);
    res.status(200).send(response);
  },
  async getSite(req: Request, res: Response) {
    const id = req.params.id;
    if(!id) throw new Error("ID is missing.");

    const response = await DBPG.query("SELECT * FROM sites WHERE site_id = $1", [id]);
    res.status(200).send(response);
  },
  async addSite(req: Request, res: Response) {},
  async addMultipleSites(req: Request, res: Response) {},
  async updateSite(req: Request, res: Response) {},
  async manageSite(req: Request, res: Response) {},
  async deleteSite(req: Request, res: Response) {},
};
