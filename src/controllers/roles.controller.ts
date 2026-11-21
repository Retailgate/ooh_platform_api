import { Request, Response } from "express";
import { DBPG } from "../db/db-pg";

const GUEST_ROLE = "db645270-a314-45f6-968a-e690b4be4c67" as const;
export const RoleController = {
  async test(req: Request, res: Response) {
    res.status(200).send({ response: "You're in!" });
  },

  async getRoles(_: Request, res: Response) {
    const response = await DBPG.query(
      `SELECT role_id, name FROM user_roles WHERE status = 1 ORDER BY name ASC;`,
      [],
    );
    res.status(200).send(response);
  },
  async getRole(req: Request, res: Response) {
    const id = req.params.id;
    if (!id) {
      res.status(400).send("ID not found.");
    }
    const [response] = await DBPG.query(
      `SELECT
        r.role_id,
        r.name,
        r.description,
        r.admin,
        r.client,
        r.is_removable,
        r.status,
        r.date_created,
        COALESCE(
            JSONB_AGG(DISTINCT p.key)
            FILTER (WHERE p.key IS NOT NULL),
            '[]'::jsonb
        ) AS permissions

    FROM user_roles r

    LEFT JOIN role_permissions rp
        ON r.role_id = rp.role_id

    LEFT JOIN permissions p
        ON rp.permission_key = p.key

    WHERE r.role_id = $1
    GROUP BY r.role_id;`,
      [id],
    );
    res.status(200).send(response);
  },

  async addRole(req: Request, res: Response) {
    const data = req.body;
    if (!data) {
      res.status(400).send("Data not found.");
    }
    const [response] = await DBPG.query(
      "INSERT INTO user_roles (name, description, status, admin, client, is_removable) VALUES ($1,$2, 1, false, false, true) RETURNING role_id",
      [data.name, data.description],
    );
    if (!("role_id" in response)) {
      res.status(400).send({
        message: "SQL Query Error.",
      });
    }
    res.status(200).send({
      response: response.role_id,
      success: true,
      message: "Created permission group successfully.",
    });
  },

  async updateRoleDetails(req: Request, res: Response) {
    const role_id = req.params.id;
    const { name, description } = req.body;

    if (!name || !description || !role_id) {
      res.status(400).send({
        message: "Role data is missing.",
      });
    }

    try {
      await DBPG.query("BEGIN", []);
      // Remove permissions that are no longer selected.
      await DBPG.query(
        `UPDATE user_roles SET name = $1, description = $2 WHERE role_id = $3;`,
        [name, description, role_id],
      );

      await DBPG.query("COMMIT", []);

      res.status(200).send({
        success: true,
        message: "Role permissions have been updated.",
      });
    } catch (error) {
      await DBPG.query("ROLLBACK", []);
      throw error;
    }
  },

  async updateRolePermissions(req: Request, res: Response) {
    const role_id = req.params.id;
    const { permissions, admin, client } = req.body;

    if (!role_id || !permissions) {
      res.status(400).send({
        message: "Role data is missing.",
      });
    }

    try {
      await DBPG.query("BEGIN", []);
      // Remove permissions that are no longer selected.
      await DBPG.query(
        `DELETE FROM role_permissions
      WHERE role_id = $1
      AND NOT (permission_key = ANY($2::text[]))
      `,
        [role_id, permissions],
      );

      await DBPG.query(
        `INSERT INTO role_permissions (role_id, permission_key)
      SELECT $1, unnest($2::text[])
      ON CONFLICT (role_id, permission_key) DO NOTHING
      `,
        [role_id, permissions],
      );

      await DBPG.query(
        `UPDATE user_roles SET admin = $1, client = $2 WHERE role_id = $3;`,
        [admin, client, role_id],
      );

      await DBPG.query("COMMIT", []);

      res.status(200).send({
        success: true,
        message: "Role permissions have been updated.",
      });
    } catch (error) {
      await DBPG.query("ROLLBACK", []);
      throw error;
    }
  },

  //PERMISSION FUNCTIONS
  async getPermissionGroups(_: Request, res: Response) {
    const response = await DBPG.query(
      `SELECT
        pg.permission_group_id,
        pg.name,
        pg.status,
        COALESCE(
          JSONB_AGG(
            JSONB_BUILD_OBJECT(
            'permission_id', p.permission_id,
              'key', p.key,
              'label', p.label
            )
            ORDER BY p.label
          ) FILTER (WHERE p.key IS NOT NULL),
          '[]'::jsonb
        ) AS actions
      FROM permission_group pg
      LEFT JOIN permissions p
        ON p.permission_group = pg.permission_group_id
      GROUP BY
        pg.permission_group_id,
        pg.name,
        pg.status
      ORDER BY pg.name ASC`,
      [],
    );
    res.status(200).send(response);
  },
  async addPermissionGroup(req: Request, res: Response) {
    const data = req.body;
    if (!data) {
      res.status(400).send("Data not found.");
    }
    const response = await DBPG.query(
      "INSERT INTO permission_group (name) VALUES ($1) RETURNING permission_group_id",
      [data.name],
    );
    if (!response.length) {
      res.status(400).send({
        message: "SQL Query Error.",
      });
    }
    res.status(200).send({
      response: response[0].permission_group_id,
      success: true,
      message: "Created permission group successfully.",
    });
  },
  async editPermissionGroupName(req: Request, res: Response) {
    const id = req.params.id;
    const name = req.body.name;
    if (!id || !name) {
      res.status(400).send("ID not found.");
    }
    await DBPG.query(
      "UPDATE permission_group SET name = $1 WHERE permission_group_id = $2",
      [name, id],
    );
    res.status(200).send({
      success: true,
      message: "Permission Group name updated successfully.",
    });
  },
  async addPermission(req: Request, res: Response) {
    const permissionGroupId = req.params.id;
    const data = req.body;

    if (!permissionGroupId || !data) {
      res.status(400).send("ID not found.");
    }
    const response = await DBPG.query(
      "INSERT INTO permissions (permission_group, key, label) VALUES ($1,$2,$3) RETURNING permission_id",
      [permissionGroupId, data.key, data.label],
    );
    if (!response.length) {
      res.status(400).send({
        message: "SQL Query Error.",
      });
    }
    res.status(200).send({
      response: response[0].permission_group_id,
      success: true,
      message: "Created permission successfully.",
    });
  },

  async deleteRole(req: Request, res: Response) {
    const role_id = req.params.id;

    if (!role_id) {
      res.status(400).send("ID not found.");
    }
    try {
      await DBPG.query("BEGIN", []);

      await DBPG.query(
        "UPDATE user_accounts SET role_id = $1 WHERE role_id = $2",
        [GUEST_ROLE, role_id],
      );

      // Remove role that are no longer selected.
      await DBPG.query("UPDATE user_roles SET status = 0 WHERE role_id = $1", [
        role_id,
      ]);

      await DBPG.query("COMMIT", []);

      res.status(200).send({
        success: true,
        message: "Role has been deleted.",
      });
    } catch (error) {
      await DBPG.query("ROLLBACK", []);
      res.status(400).send({
        success: false,
        message: (error as Error).message,
      });
    }
  },
  async deletePermission(req: Request, res: Response) {
    const permissionGroupId = req.params.id;

    if (!permissionGroupId) {
      res.status(400).send("ID not found.");
    }
    await DBPG.query("DELETE FROM permissions WHERE permission_id = $1", [
      permissionGroupId,
    ]);
    res.status(200).send({
      success: true,
      message: "Permission has been deleted",
    });
  },
  async deletePermissionGroup(req: Request, res: Response) {
    const permissionGroupId = req.params.id;

    if (!permissionGroupId) {
      res.status(400).send("ID not found.");
    }
    await DBPG.query(
      "DELETE FROM permission_group WHERE permission_group_id = $1",
      [permissionGroupId],
    );
    res.status(200).send({
      success: true,
      message: "Permission group has been deleted.",
    });
  },
};
