import { Request, Response } from "express";
import * as uuid from "uuid";
import { DBPG } from "../db/db-pg";
import { Auth } from "./middleware.controller";
import crypto from "crypto";
import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import * as config from "../config/config";
import { RegistrationType } from "../utils/types";
import { getInitials } from "../utils/helper";
import { sendEmail, verifyEmailConnection } from "../utils/email";

export const UserController = {
  async test(req: Request, res: Response) {
    const response = await sendEmail({
      to: "vrinoza@unmg.com.ph",
      subject: "Test Email",
      html: `<h1>Welcome to OOH Platform!</h1>`,
    });
    console.log(response);
    res.status(200).send({ response: "You're in!", status: response });
  },

  async getAcccessToken(req: Request, res: Response) {
    try {
      const body = req.body;

      const username = body.username;
      const password = body.password;
      const rememberMe = body.rememberMe;

      if (!username || !password) {
        res.status(400).send({
          message: "Username and password is required.",
        });
      }

      const response: any = await Auth.getToken(username, password, rememberMe);

      if (response.token == null) {
        res.status(401).send({
          message: response.error_message,
        });
      } else {
        res.cookie("token", response.token, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          domain: undefined,
          path: "/",
        });
        res.cookie("user", JSON.stringify(response), {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          domain: undefined,
          path: "/",
        });
        res.cookie("role", response.role_id, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          domain: undefined,
          path: "/",
        });
        res.status(200).send({
          id: response.id,
          first_name: response.first_name,
          last_name: response.last_name,
          username: response.username,
          email_address: response.email_address,
          company: response.company,
          role_id: response.role_id,
          token: response.token,
          admin: response.admin,
        });
        //res.status(200).send({"token": response.token, "roles": response.roles})
      }
    } catch (e: unknown) {
      console.log(e);
      if (e instanceof Error) {
        return res.status(400).json({
          success: false,
          message: e.message,
        });
      }
    }
  },

  async registerAccount(req: Request, res: Response) {
    const data: RegistrationType = req.body;
    if (!data) {
      res.status(400).send({
        message: "Invalid data.",
      });
    }

    const password = await bcrypt.hash(data.password, 12);
    let roleID = "d100f441-b82f-425e-96fb-72f7cd6e51dc";
    if (data.type === "enterprise") {
      roleID = "fd0636e6-cc1c-4172-9463-109a9644cb1f";
    }
    const [aResult] = await DBPG.query(
      'INSERT INTO user_accounts ("username","email_address","password","role_id","status","type") VALUES ($1,$2,$3,$4,$5,$6) RETURNING account_id',
      [data.username, data.email_address, password, roleID, 1, data.type],
    );
    if (aResult) {
      const accountID = aResult.account_id;
      let companyID = null;
      let position = null;
      if (data.type === "enterprise") {
        //check company existence first
        const [company_id] = await DBPG.query(
          `SELECT company_id WHERE "name" = $1`,
          [data.company_name],
        );
        if (!company_id) {
          const code = getInitials(data.company_name);
          const [cResult] = await DBPG.query(
            'INSERT INTO companies ("name","code","address","telephone") VALUES ($1,$2,$3,$4) RETURNING company_id',
            [
              data.company_name,
              code,
              data.company_address,
              data.company_telephone,
            ],
          );
          companyID = cResult.company_id;
        } else {
          companyID = company_id;
        }
        position = data.position;
      }
      await DBPG.query(
        'INSERT INTO user_information ("account_id","company_id","first_name","last_name","position","phone") VALUES ($1,$2,$3,$4,$5,$6) RETURNING user_id',
        [
          accountID,
          companyID,
          data.first_name,
          data.last_name,
          position,
          data.phone,
        ],
      );
      res.status(200).send({
        success: true,
        message: req.query.admin
          ? "Account created. Their credentials will be sent to their email address."
          : "You are now registered. You will receive an email confirmation shortly.",
      });
    }
  },

  async getRole(req: Request, res: Response) {
    var id = req.query.id;
    var roles = await getUserRole(id);

    res.status(200).send(id ? roles[0] : roles);
  },

  async getModules(req: Request, res: Response) {
    const id = req.query.id;
    let sql = `SELECT * FROM modules`;
    var params: any = [];
    if (id) {
      sql = `SELECT * FROM modules`;
      params = [id];
    }
    var resSql: any = await DBPG.query(sql, params);

    res.status(200).send(resSql);
  },

  // Create new role
  async addRole(req: Request, res: Response) {
    try {
      const data = req.body;

      if (data) {
        const { access } = data;
        try {
          const sql = `INSERT INTO user_roles("name", "description", "admin", "client") VALUES($1,$2,$3,$4) RETURNING role_id;`;
          const params = [data.name, data.description, data.admin, data.client];
          const resRole: any = await DBPG.query(sql, params);
          const role_id = resRole[0].role_id;

          const insertStatus: any = [];

          for (const module of access) {
            const { permissions } = module;
            const sqlModule = `INSERT INTO role_permissions("role_id", "module_id", "can_view", "can_add", "can_edit", "can_delete") VALUES($1,$2,$3,$4,$5,$6);`;
            const paramsModule = [
              role_id,
              module.module_id,
              permissions[0],
              permissions[1],
              permissions[2],
              permissions[3],
            ];
            const resModule: any = await DBPG.query(sqlModule, paramsModule);
            insertStatus.push(resModule ? true : false);
          }

          if (insertStatus.includes(false)) {
            res.status(400).send({
              success: false,
              error_message: "Insertion failed.",
            });
          } else {
            res.status(200).send({
              success: true,
              role_id,
            });
          }
        } catch (err) {
          res.status(400).send({
            success: false,
            error_message: err,
          });
        }
      } else {
        res.status(400).send({
          success: false,
          error_message: "Insertion failed. No data provided.",
        });
      }
    } catch (err) {
      console.log(err);
      res.status(400).send({
        success: false,
        error_message: "Insertion failed.",
      });
    }
  },

  //Update role details
  async updateRole(req: Request, res: Response) {
    const data = req.body;
    const id = req.query.id;
    if (id) {
      if (data) {
        const { access } = data;
        try {
          const sql = `UPDATE user_roles SET "name" = $1, "description" = $2, "admin" = $3, "client" = $4 WHERE role_id = $5;`;
          const params = [
            data.name,
            data.description,
            data.admin,
            data.client,
            id,
          ];
          const resSql: any = await DBPG.query(sql, params);

          const updateStatus: any = [];

          for (const module of access) {
            if (module.permission_id) {
              const { permissions } = module;
              const sqlModule = `UPDATE role_permissions SET "can_view" = $1, "can_add" = $2, "can_edit" = $3, "can_delete" = $4 WHERE "permission_id" = $5;`;
              const paramsModule = [
                permissions[0],
                permissions[1],
                permissions[2],
                permissions[3],
                module.permission_id,
              ];
              const resModule: any = await DBPG.query(sqlModule, paramsModule);
              updateStatus.push(resModule ? true : false);
            } else {
              const { permissions } = module;
              const sqlModule = `INSERT INTO role_permissions("role_id", "module_id", "can_view", "can_add", "can_edit", "can_delete") VALUES($1,$2,$3,$4,$5,$6);`;
              const paramsModule = [
                id,
                module.module_id,
                permissions[0],
                permissions[1],
                permissions[2],
                permissions[3],
              ];
              const resModule: any = await DBPG.query(sqlModule, paramsModule);
              updateStatus.push(resModule ? true : false);
            }
          }

          if (updateStatus.includes(false)) {
            res.status(400).send({
              success: false,
              error_message: "Update failed.",
            });
          } else {
            res.status(200).send({
              success: true,
            });
          }
        } catch (err) {
          res.status(400).send({
            success: false,
            error_message: err,
          });
        }
      } else {
        res.status(400).send({
          success: false,
          error_message: "Update failed. No data provided.",
        });
      }
    } else {
      res.status(400).send({
        success: false,
        error_message: "Update failed. No role ID specified.",
      });
    }
  },

  //Update role status
  async updateRoleStatus(req: Request, res: Response) {
    var role_details = req.body;
    var id = req.query.id;
    if (id) {
      if (Object.keys(role_details).length) {
        var sql = `UPDATE "user_roles" SET status = $1
        WHERE role_id = $2`;
        var params: any = [role_details["status"], id];
        var resSql: any = await DBPG.query(sql, params);
        res.status(200).send({
          success: true,
        });
      } else {
        res.status(400).send({
          success: false,
          error_message: "Update failed. No data provided.",
        });
      }
    } else {
      res.status(400).send({
        success: false,
        error_message: "Update failed. No role ID specified.",
      });
    }
  },

  async deleteRole(req: Request, res: Response) {},

  // Get list of users or Get user by ID
  async getUser(req: Request, res: Response) {
    const id = req.query.id;
    let params = [];

    let sql = `SELECT ui.account_id, ui.first_name, ui.last_name, ua.username, ua.email_address, ui.phone, ui.company_id, ui.position, ua.role_id, ua.status, ur.admin
        FROM user_accounts ua 
        JOIN user_information ui ON ua.account_id = ui.account_id
		    JOIN user_roles ur ON ua.role_id = ur.role_id`;

    if (id) {
      sql += ` WHERE ua.account_id = $1`;
      params.push(id);
    }

    const users = await DBPG.query(sql, params);

    res.status(200).send(!id ? users : users[0]);
  },

  // Create new user
  async addUser(req: Request, res: Response) {
    var userInfo = req.body;
    if (Object.keys(userInfo).length) {
      try {
        var user_id = uuid.v4();
        var pass_id = uuid.v4();
        var sql = `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress", "role_id", "status") VALUES($1, $2, $3, $4, $5, $6, $7);`;
        var params: any = [
          user_id,
          userInfo.first_name,
          userInfo.last_name,
          userInfo.username,
          userInfo.email_address,
          userInfo.role,
          "active",
        ];
        var resSql = await DBPG.query(sql, params);

        var sqlPass = `INSERT INTO "password"("pass_id", "user_id", "password", "isActive", "expiryDate") VALUES($1, $2, $3, $4, $5);`;
        // Set expiryDate to 6 months from now
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 6);
        var paramsPass: any = [
          pass_id,
          user_id,
          crypto.createHash("md5").update(userInfo.password).digest("hex"),
          true,
          expiryDate.toISOString().slice(0, 19).replace("T", " "),
        ];
        var resPass = await DBPG.query(sqlPass, paramsPass);

        res.status(200).send({
          user_id,
        });
      } catch (err) {
        res.status(400).send({
          success: false,
          error_message: err,
        });
      }
    } else {
      res.status(400).send({
        success: false,
        error_message: "Insertion failed. No data provided.",
      });
    }
  },

  // Update user details
  async updateUserInfo(req: Request, res: Response) {
    var id = req.query.id;
    var userInfo = req.body;
    if (id) {
      if (Object.keys(userInfo).length) {
        try {
          var sql = `UPDATE "users" SET "firstName" = $1, "lastName" = $2, "userName" = $3, "emailAddress" = $4, "role_id" = $5, "status" = $6
          WHERE "user_id" = $7;`;
          var params: any = [
            userInfo.first_name,
            userInfo.last_name,
            userInfo.username,
            userInfo.email_address,
            userInfo.role,
            userInfo.status,
            id,
          ];
          var resSql = await DBPG.query(sql, params);

          res.status(200).send({
            success: true,
          });
        } catch (err) {
          res.status(400).send({
            success: false,
            error_message: err,
          });
        }
      } else {
        res.status(400).send({
          success: false,
          error_message: "Update failed. No data provided.",
        });
      }
    } else {
      res.status(400).send({
        success: false,
        error_message: "Update failed. No user ID specified.",
      });
    }
  },

  //Update user role or status
  async updateUserRoleOrStatus(req: Request, res: Response) {
    var key = req.query.key;
    var id = req.query.id;
    var userInfo = req.body;

    if (id) {
      if (key) {
        if (Object.keys(userInfo).length) {
          if (key === "role") {
            try {
              var sql = `UPDATE "users" SET "role_id" = $1
              WHERE "user_id" = $2;`;
              var params: any = [userInfo.role, id];
              var resSql = await DBPG.query(sql, params);

              res.status(200).send({
                success: true,
              });
            } catch (err) {
              res.status(400).send({
                success: false,
                error_message: err,
              });
            }
          } else if (key === "status") {
            try {
              var sql = `UPDATE "users" SET "status" = $1
              WHERE "user_id" = $2;`;
              var params: any = [userInfo.status, id];
              var resSql = await DBPG.query(sql, params);

              res.status(200).send({
                success: true,
              });
            } catch (err) {
              res.status(400).send({
                success: false,
                error_message: err,
              });
            }
          } else {
            res.status(400).send({
              success: false,
              error_message: "Invalid key value.",
            });
          }
        } else {
          res.status(400).send({
            success: false,
            error_message: "Update failed. No data provided.",
          });
        }
      } else {
        res.status(400).send({
          success: false,
          error_message: "Update failed. No key specified.",
        });
      }
    } else {
      res.status(400).send({
        success: false,
        error_message: "Update failed. No user ID specified.",
      });
    }
  },

  //Update module or status
  async toggleModule(req: Request, res: Response) {
    var module = req.body;
    if (module) {
      if (Object.keys(module).length == 2) {
        var sql = `UPDATE "modules" SET "status" = $1
        WHERE module_id = $2`;
        var params: any = [module.status, module.id];
        var resSql: any = await DBPG.query(sql, params);
        res.status(200).send({
          success: true,
        });
      } else {
        res.status(400).send({
          success: false,
          error_message: "Update failed. No data provided.",
        });
      }
    } else {
      res.status(400).send({
        success: false,
        error_message: "Update failed. No ID specified.",
      });
    }
  },

  async addModule(req: Request, res: Response) {
    var module = req.body;

    if (module) {
      var sql = `INSERT INTO "modules" ("name", "is_parent", "view") VALUES ($1, $2, $3);`;
      var params: any = [module.name, module.is_parent, module.view];
      var resSql: any = await DBPG.query(sql, params);
      res.status(200).send({
        success: true,
      });
    } else {
      res.status(400).send({
        success: false,
        error_message: "Insert failed. No data provided.",
      });
    }
  },

  // Verify if email exists in the database
  async emailChecking(req: Request, res: Response) {
    var email_addr = req.body.email_address;

    var sql = `SELECT "user_id", "firstName", "lastName", "emailAddress"
    FROM "users"
    WHERE "emailAddress" = $1;`;
    var params = [email_addr];
    var resSql: any = await DBPG.query(sql, params);

    if (resSql.length) {
      res.status(200).send({
        success: true,
        user_id: resSql[0].user_id,
      });
      // try {
      //   // Send email to user
      //   //var email_addr = email_addr;
      //   var encrypt_uid: any = await EncryptUtils.encrypt(
      //     resSql[0].user_id + "___" + token
      //   );
      //   var full_name = resSql[0].firstName + " " + resSql[0].lastName;
      //   var subject = "OOH Platform Change Password";
      //   var attachments = null;
      //   var email_body =
      //     `<body>
      //     <p>Hello, ` +
      //     resSql[0].firstName +
      //     `! </p>
      //     <p>
      //     We received a request to change your password. If you didn't make the request, ignore this email. To change your password, click this <a href="http://test.unmg.com.ph/password-recovery/?id=` +
      //     encrypt_uid.encryptedData +
      //     `">link</a> or copy the link below and paste it to your browser URL field to change your password:
      //     </p>
      //     <p>
      //     http://test.unmg.com.ph/password-recovery/` +
      //     encrypt_uid.encryptedData +
      //     `
      //     </p>
      //   </body>`;
      //   var success = await EmailUtils.sendEmailMS(
      //     email_addr,
      //     full_name,
      //     subject,
      //     email_body,
      //     attachments
      //   );
      //   console.log(email_body);

      //   if (success) {
      //     res.status(200).send({
      //       success: true,
      //     });
      //   } else {
      //     res.status(400).send({
      //       success: false,
      //       error_message: "Email sending failed.",
      //     });
      //   }
      // } catch (error) {
      //   res.status(400).send({
      //     success: false,
      //     error_message: error,
      //   });
      // }
    } else {
      res.status(400).send({
        success: false,
        error_message: "Email address does not exist in the user database.",
      });
    }
  },

  async passwordUpdate(req: Request, res: Response) {
    let password = req.body.password;
    var id = req.body.id;
    console.log(password, id);
    password = crypto.createHash("md5").update(password).digest("hex");
    try {
      console.log(password);
      var sql = `UPDATE "password" SET "password" = $1 WHERE "user_id" = $2;`;
      var params = [password, id];
      var resSql: any = await DBPG.query(sql, params);

      if (resSql) {
        console.log(resSql);
        res.status(200).send({
          success: true,
        });
      } else {
        res.status(400).send({
          error_message: "Something's afoot.",
        });
      }
    } catch (error) {
      res.status(400).send({
        success: false,
        error_message: error,
      });
    }
  },
  async fetchCookies(req: Request, res: Response) {
    if (req.cookies.token) {
      const decoded: any = jwt.verify(
        req.cookies.token,
        config.env.TOKEN_SECRET,
      );
      if (!decoded) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      res.status(200).send(req.cookies);
    } else {
      res.status(200).send({ loggedOut: true });
    }
  },

  async logoutUser(req: Request, res: Response) {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
    res.clearCookie("user", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
    res.clearCookie("role", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });

    res.status(200).send({
      message: "Logged out successfully",
      data: req.cookies,
    });
  },
};

async function getUserRole(id: any) {
  var sql = ``;
  var params: any = [];
  var resSql: any;
  var roles: any = {};

  sql = `SELECT ur.role_id, rp.permission_id, m.module_id, ur.status, ur.name as role_name, ur.description, ur.admin, ur.client, m.name as module_name, m.is_parent, m.parent_id, rp.can_view, rp.can_add, rp.can_edit, rp.can_delete, m.view, m.status as module_status 
FROM user_roles ur 
LEFT JOIN role_permissions rp ON rp.role_id = ur.role_id 
JOIN modules m ON m.module_id = rp.module_id`;

  if (id) {
    sql += ` WHERE ur.role_id = $1`;
  }

  params = id ? [id] : [];
  resSql = await DBPG.query(sql, params);

  for (const row of resSql) {
    const module = {
      permission_id: row.permission_id,
      module_id: row.module_id,
      name: row.module_name,
      is_parent: row.is_parent,
      parent_id: row.parent_id,
      status: row.module_status,
      view: row.view,
      permissions: [row.can_view, row.can_add, row.can_edit, row.can_delete],
    };

    if (!roles[row.role_id]) {
      roles[row.role_id] = {
        role_id: row.role_id,
        name: row.role_name,
        description: row.description,
        admin: row.admin,
        client: row.client,
        status: row.status,
        access: [],
      };
    }

    roles[row.role_id].access.push(module);
  }

  return Object.values(roles);
}
