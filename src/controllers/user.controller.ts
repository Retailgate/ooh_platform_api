import e, { Request, Response } from "express";
import * as SqlString from "sqlstring";
import * as uuid from "uuid";
//import { DB } from '../db/db';
import { DBPG } from "../db/db-pg";
import { Auth } from "./middleware.controller";
import { EmailUtils } from "../utils/EmailUtils";
import { EncryptUtils } from "../utils/EncryptUtils";
import { MYSQL } from "../db/mysql-pg";

export const UserController = {
  async test(req: Request, res: Response) {
    res.status(200).send({ response: "You're in!" });
  },

  async getAcccessToken(req: Request, res: Response) {
    var username = req.body.username ? req.body.username : null;
    var emailAddr = req.body.email_address ? req.body.email_address : null;
    var password = req.body.password ? req.body.password : null;

    const response: any = await Auth.getToken(
      username,
      emailAddr,
      password,
      res
    );
    //console.log(req);
    //var sql = SqlString.format(`INSERT INTO logs(ip_address, endpoint, function, query) VALUES(?, ?, ?, ?);`, [requestIp.getClientIp(req), 'getAccessToken', null, null]);
    //var result = await DB.query(sql);
    //var role_arr:any = [];
    //role_arr.push(response.roles);
    if (response.token == null) {
      res.status(401).send({
        message: response.error_message,
      });
    } else {
      res.status(200).send({
        id: response.id,
        first_name: response.first_name,
        last_name: response.last_name,
        username: response.username,
        email_address: response.email_address,
        role_id: response.role_id,
        token: response.token,
      });
      //res.status(200).send({"token": response.token, "roles": response.roles})
    }
  },

  async registerUser(req: Request, res: Response) {
    var userID = uuid.v4();
    var passID = uuid.v4();
    var firstName = req.body.first_name;
    var lastName = req.body.last_name;
    var userName = req.body.username;
    var emailAddress = req.body.email_address;
    var password = req.body.password;

    var sqlEmail = `SELECT "emailAddress" FROM "users" WHERE "emailAddress" = $1;`;
    var paramsEmail: any = [emailAddress];
    var resEmail: any = await DBPG.query(sqlEmail, paramsEmail);

    var sqlUsername = `SELECT "userName" FROM "users" WHERE "userName" = $1;`;
    var paramsUsername: any = [userName];
    var resUsername: any = await DBPG.query(sqlUsername, paramsUsername);

    if (!resEmail.length && !resUsername.length) {
      var sql = `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;
      var params = [userID, firstName, lastName, userName, emailAddress];
      var resSql: any = await DBPG.query(sql, params);

      var sqlPass = `INSERT INTO "password"("pass_id", "user_id", "password", "isActive", "expiryDate") VALUES($1,$2,$3,$4,$5);`;
      var paramsPass: any = [
        passID,
        userID,
        password,
        1,
        "2024-01-01 00:00:00",
      ];
      var resPass: any = await DBPG.query(sqlPass, paramsPass);

      res.status(200).send({
        id: userID,
        first_name: firstName,
        last_name: lastName,
        username: userName,
        email_address: emailAddress,
      });
    } else if (resEmail.length) {
      res.status(400).send({
        message: "Email address (" + emailAddress + ") is already in use.",
      });
    } else if (resUsername.length) {
      res.status(400).send({
        message: "Username (" + userName + ") is already in use.",
      });
    }
  },

  async getRole(req: Request, res: Response) {
    var id = req.query.id;
    var roles = await getUserRole(id);

    res.status(200).send(id ? roles[0] : roles);
  },

  async getModules(req: Request, res: Response) {
    var sql = `SELECT * FROM modules;`;
    var params: any = [];
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
    var id = req.query.id;
    var sql = "";
    var params: any = [];
    var resSql: any;

    if (!id) {
      sql = `SELECT u."user_id", u."firstName", u."lastName", u."userName", u."emailAddress",
      r."role_id", r."name", u."status"
      FROM "users" u
      JOIN "user_roles" r
      ON r.role_id = u.role_id;`;
      params = [];
      resSql = await DBPG.query(sql, params);
      var index = 0;
      var data_arr: any = [];

      if (resSql.length) {
        for (let row in resSql) {
          data_arr.push({
            id: index,
            user_id: resSql[row].user_id,
            first_name: resSql[row].firstName,
            last_name: resSql[row].lastName,
            username: resSql[row].userName,
            email_address: resSql[row].emailAddress,
            role: resSql[row].role_id,
            status: resSql[row].status,
          });
          index += 1;
        }
        res.status(200).send(data_arr);
      } else {
        res.status(200).send(data_arr);
      }
    } else {
      sql = `SELECT u."user_id", u."firstName", u."lastName", u."userName", u."emailAddress",
      r."role_id", r."name", u."status"
      FROM "users" u
      JOIN "user_roles" r
      ON r.role_id = u.role_id
      WHERE u."user_id" = $1;`;
      params = [id];
      resSql = await DBPG.query(sql, params);

      if (resSql.length) {
        res.status(200).send({
          user_id: resSql[0].user_id,
          first_name: resSql[0].firstName,
          last_name: resSql[0].lastName,
          username: resSql[0].userName,
          email_address: resSql[0].emailAddress,
          role: resSql[0].role_id,
          status: resSql[0].status,
        });
      } else {
        res.status(400).send({
          error_message: "User not found.",
        });
      }
    }
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
        var paramsPass: any = [
          pass_id,
          user_id,
          userInfo.username,
          true,
          "2024-01-01 00:00:00",
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

  async getAccountExecutives(_: Request, res: Response){
    var sql = `SELECT CONCAT(first_name, " ", last_name) as full_name FROM hd_users WHERE inactive = 0 AND position_id <> 4 AND team_id IN (1,2,3,4,8,9,13,14) AND users_id NOT IN (237)`;
    var params: any = [];
    var resSql: any = await MYSQL.query(sql, params);

    res.status(200).send(resSql);
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

    // Generate token
    var token = uuid.v4();

    var sqlToken = `UPDATE "password" 
    SET change_pass_token = $1
    WHERE user_id = $2;`;
    var paramsToken = [token, resSql[0].user_id];
    var resToken: any = await DBPG.query(sqlToken, paramsToken);

    if (resSql.length) {
      try {
        // Send email to user
        //var email_addr = email_addr;
        var encrypt_uid: any = await EncryptUtils.encrypt(
          resSql[0].user_id + "___" + token
        );
        var full_name = resSql[0].firstName + " " + resSql[0].lastName;
        var subject = "OOH Platform Change Password";
        var attachments = null;
        var email_body =
          `<body>
          <p>Hello, ` +
          resSql[0].firstName +
          `! </p>
          <p>
          We received a request to change your password. If you didn't make the request, ignore this email. To change your password, click this <a href="http://test.unmg.com.ph/password-recovery/?id=` +
          encrypt_uid.encryptedData +
          `">link</a> or copy the link below and paste it to your browser URL field to change your password:
          </p>
          <p>
          http://test.unmg.com.ph/password-recovery/` +
          encrypt_uid.encryptedData +
          `
          </p>
        </body>`;
        var success = await EmailUtils.sendEmailMS(
          email_addr,
          full_name,
          subject,
          email_body,
          attachments
        );
        console.log(email_body);

        if (success) {
          res.status(200).send({
            success: true,
          });
        } else {
          res.status(400).send({
            success: false,
            error_message: "Email sending failed.",
          });
        }
      } catch (error) {
        res.status(400).send({
          success: false,
          error_message: error,
        });
      }
    } else {
      res.status(400).send({
        success: false,
        error_message: "Email address does not exist in the user database.",
      });
    }
  },

  async passwordUpdate(req: Request, res: Response) {
    var password = req.body.password;
    var id = req.body.id;
    var decrypted_id: any = await EncryptUtils.decrypt(id);
    var decrypted_uid = decrypted_id.split("___")[0];
    var token = decrypted_id.split("___")[1];
    console.log(decrypted_uid);
    try {
      var sqlToken = `SELECT change_pass_token 
      FROM password
      WHERE user_id = $1;`;
      var paramsToken = [decrypted_uid];
      var resToken: any = await DBPG.query(sqlToken, paramsToken);

      if (resToken.length) {
        if (resToken[0].change_pass_token === token) {
          var sql = `UPDATE "password" SET "password" = $1, "change_pass_token" = $2
          WHERE "user_id" = $3;`;
          var params = [password, null, decrypted_uid];
          var resSql: any = await DBPG.query(sql, params);

          res.status(200).send({
            success: true,
          });
        } else {
          res.status(400).send({
            error_message: "Change pass token is invalid.",
          });
        }
      }
    } catch (error) {
      res.status(400).send({
        success: false,
        error_message: error,
      });
    }
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
