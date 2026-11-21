import { NextFunction, Request, Response } from "express";
import { DBPG } from "../db/db-pg";
import { Auth, Global } from "./middleware.controller";
import crypto from "crypto";
import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import * as config from "../config/config";
import { sendEmail } from "../utils/email";

export const UserController = {
  async test(req: Request, res: Response) {
    const response = await sendEmail({
      to: "vrinoza@unmg.com.ph",
      subject: "Test Email",
      html: `<h1>Welcome to OOH Platform!</h1>`,
    });
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
          secure: true,
          sameSite: "none",
       
          path: "/",
          maxAge: rememberMe
            ? 30 * 24 * 60 * 60 * 1000 // 30 days
            : undefined, // Session cookie
        });
        res.status(200).send({
          id: response.account_id,
          first_name: response.first_name,
          last_name: response.last_name,
          username: response.username,
          email_address: response.email_address,
          company: response.company,
          role_id: response.role_id,
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

  // Get list of users or Get user by ID
  async getUsers(_: Request, res: Response) {
    const response = await DBPG.query(
      `SELECT a.account_id, a.username, a.email_address, a.role_id, a.status, i.company_id, i.position, i.phone, i.first_name, i.last_name FROM user_accounts a JOIN user_information i ON a.account_id = i.account_id`,
      [],
    );

    res.status(200).send(response);
  },

  async getUser(req: Request, res: Response) {
    const id = req.params.id;
    if (!id) {
      res.status(400).send({
        message: "ID not found",
      });
    }

    let sql = `SELECT a.account_id, a.username, a.email_address, a.role_id, a.status, i.company_id, i.position, i.phone, i.first_name, i.last_name FROM user_accounts a JOIN user_information i ON a.account_id = i.account_id  WHERE a.account_id = $1`;

    const [user] = await DBPG.query(sql, [id]);

    res.status(200).send(user);
  },

  // Create new user
  async addUser(req: Request, res: Response, next: NextFunction) {
    const data = req.body;

    try {
      if (!data) {
        throw new Error("Data not found");
      }

      await DBPG.query("BEGIN", []);

      const isAlreadyRegistered = await DBPG.query(
        "SELECT * FROM user_accounts WHERE email_address ILIKE $1",
        [data.email_address],
      );
      if (isAlreadyRegistered.length) {
        throw new Error("Email already in use");
      }

      const username = `${data.first_name.charAt(0)}${data.last_name}`
        .replace(/[^a-zA-Z]/g, "")
        .toLowerCase();
      const password = await bcrypt.hash(username, 12);

      const [account_response] = await DBPG.query(
        "INSERT INTO user_accounts (username, email_address, password, role_id) VALUES ($1,$2,$3,$4) RETURNING account_id",
        [username, data.email_address, password, data.role_id],
      );

      if (!account_response) {
        throw new Error("An error occured while creating your account.");
      }
      const account_id = account_response.account_id;

      const response = await DBPG.query(
        "INSERT INTO user_information (account_id, company_id, first_name, last_name, position, phone) VALUES ($1,$2,$3,$4,$5,$6) RETURNING user_id;",
        [
          account_id,
          data.company_id ?? null,
          data.first_name,
          data.last_name,
          data.position ?? null,
          data.phone ?? null,
        ],
      );

      if (!response.length) {
        throw new Error("An error occured while creating your account.");
      }
      await DBPG.query("COMMIT", []);

      res.locals.email_payload = {
        email_address: data.email_address,
        password: username,
        name: data.first_name,
      };
      next();
    } catch (e) {
      if (e instanceof Error) {
        await DBPG.query("ROLLBACK", []);
        res.status(400).send({ message: e.message });
      }
    }
  },

  async updateUser(req: Request, res: Response) {
    const id = req.params.id;
    const { data, table } = req.body;
    if (!data || !table) {
      res.status(400).send("No fields to update");
    }

    const response = Global.updateInfo(data, table, "account_id", id);

    res.status(200).send({
      response,
      success: true,
      message: "User information updated succesfully.",
    });
  },

  async getCompanyMembers(req: Request, res: Response) {
    const companyID = req.params.id;

    if (!companyID) {
      res.status(400).send({
        message: "Company ID is missing",
      });
    }
    const response = await DBPG.query(
      "SELECT a.account_id, a.username, a.email_address, a.role_id, a.status, i.company_id, i.position, i.phone, i.first_name, i.last_name FROM user_accounts a JOIN user_information i ON a.account_id = i.account_id  WHERE i.company_id = $1",
      [companyID],
    );

    res.status(200).send(response);
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
      const [result] = await DBPG.query(
        `SELECT
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
        [decoded.role_id],
      );
      res
        .status(200)
        .send({
          ...decoded,
          permissions: result.permissions ?? decoded.permissions,
        });
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
    res.status(200).send({
      message: "Logged out successfully",
      data: req.cookies,
    });
  },
};
