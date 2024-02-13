import e, { Request, Response } from 'express';
import * as SqlString from 'sqlstring';
import * as uuid from 'uuid';
//import { DB } from '../db/db';
import { DBPG } from '../db/db-pg';
import{ Auth } from './middleware.controller';


export const UserController = {
  async test(req:Request, res:Response){
    res.status(200).send({"response": "You're in!"});
  },

  async getAcccessToken(req:Request, res:Response){
    var username = req.body.username ? req.body.username : null;
    var emailAddr =  req.body.email_address ? req.body.email_address : null;
    var password = req.body.password ? req.body.password : null; 
    
    const response:any = await Auth.getToken(username, emailAddr, password, res);
    //console.log(req);
    //var sql = SqlString.format(`INSERT INTO logs(ip_address, endpoint, function, query) VALUES(?, ?, ?, ?);`, [requestIp.getClientIp(req), 'getAccessToken', null, null]);
    //var result = await DB.query(sql);
    //var role_arr:any = [];
    //role_arr.push(response.roles);
    if(response.token == null){
      res.status(401).send({
        "message": response.error_message
      })
    } else{
      res.status(200).send({
        id: response.id,
        first_name: response.first_name,
        last_name: response.last_name,
        username: response.username,
        email_address: response.email_address
      });
      //res.status(200).send({"token": response.token, "roles": response.roles})
    }
  },

  async registerUser(req:Request, res:Response){
    var userID = uuid.v4();
    var passID = uuid.v4();
    var firstName = req.body.first_name;
    var lastName = req.body.last_name;
    var userName = req.body.username;
    var emailAddress = req.body.email_address;
    var password = req.body.password;

    var sqlEmail = `SELECT "emailAddress" FROM "users" WHERE "emailAddress" = $1;`;
    var paramsEmail:any = [emailAddress];
    var resEmail:any = await DBPG.query(sqlEmail, paramsEmail);

    var sqlUsername = `SELECT "userName" FROM "users" WHERE "userName" = $1;`;
    var paramsUsername:any = [userName];
    var resUsername:any = await DBPG.query(sqlUsername, paramsUsername);

    if(!resEmail.length && !resUsername.length){
      var sql = `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;
      var params = [userID, firstName, lastName, userName, emailAddress];
      var resSql:any = await DBPG.query(sql, params);

      var sqlPass = `INSERT INTO "password"("pass_id", "user_id", "password", "isActive", "expiryDate") VALUES($1,$2,$3,$4,$5);`;
      var paramsPass:any = [passID, userID, password, 1, '2024-01-01 00:00:00'];
      var resPass:any = await DBPG.query(sqlPass, paramsPass);

      res.status(200).send({
        id: userID,
        first_name: firstName,
        last_name: lastName,
        username: userName,
        email_address: emailAddress
      });
    } else if(resEmail.length){
      res.status(400).send({
        'message': 'Email address (' + emailAddress + ') is already in use.' 
      });
    } else if(resUsername.length){
      res.status(400).send({
        'message': 'Username (' + userName + ') is already in use.'
      });
    }
  },

  async getRole(req:Request, res:Response){
    var id = req.query.id;

    var sql = ``;
    var params:any = []; 
    var resSql:any;
    var roles:any = [];
    if(!id){
      sql = `SELECT * FROM "roles" 
      WHERE status != 'deleted';`
      params = [];
    } else {
      sql = `SELECT * FROM roles
      WHERE role_id = $1
      AND status != 'deleted';`
      params = [id];  
    }
    resSql = await DBPG.query(sql, params);

    for(let row in resSql){
      roles.push({
        id: resSql[row].role_id,
        role_name: resSql[row].role_name,
        role_description: resSql[row].role_description,
        status: resSql[row].status,
        permissions: [
          {
            admin: {
              access: resSql[row].admin_access,
              modules: {
                sites: {
                  view: resSql[row].admin_sites_view,
                  add: resSql[row].admin_sites_add,
                  edit: resSql[row].admin_sites_edit,
                  delete: resSql[row].admin_sites_delete,
                },
                analytics: {
                  view: resSql[row].admin_analytics_view,
                  add: resSql[row].admin_analytics_add,
                  edit: resSql[row].admin_analytics_edit,
                  delete: resSql[row].admin_analytics_delete,
                },
                users: {
                  view: resSql[row].admin_users_view,
                  add: resSql[row].admin_users_add,
                  edit: resSql[row].admin_users_edit,
                  delete: resSql[row].admin_users_delete,
                },
                roles: {
                  view: resSql[row].admin_roles_view,
                  add: resSql[row].admin_roles_add,
                  edit: resSql[row].admin_roles_edit,
                  delete: resSql[row].admin_roles_delete,
                },
              },
            },
            client: {
              access: resSql[row].client_access,
              modules: {
                planning: {
                  view: resSql[row].client_planning_view,
                },
                maps: {
                  view: resSql[row].client_maps_view,
                },
                audiences: {
                  view: resSql[row].client_audiences_view,
                },
                campaign: {
                  view: resSql[row].client_campaign_view,
                },
              },
            },
          },
        ],
      });
    }

    res.status(200).send(roles);
  },

  async addRole(req:Request, res:Response){
    try{
      var role_id = uuid.v4();
      var role_details = req.body;

      if(role_details){
        var sql = `INSERT INTO "roles"("role_id","role_name","role_description", "status",
        "admin_access",
        "admin_sites_view","admin_sites_add","admin_sites_edit","admin_sites_delete",
        "admin_analytics_view","admin_analytics_add","admin_analytics_edit","admin_analytics_delete",
        "admin_users_view","admin_users_add","admin_users_edit","admin_users_delete",
        "admin_roles_view","admin_roles_add","admin_roles_edit","admin_roles_delete",
        "client_access","client_planning_view","client_maps_view","client_audiences_view","client_campaign_view")
        VALUES($1, $2, $3, $4,
        $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24, $25, $26);`;
        var params:any = [role_id, role_details.role_name, role_details.role_description, role_details.status,
        role_details.permissions[0]["admin"].access,
        role_details.permissions[0]["admin"]["modules"]["sites"]["view"],
        role_details.permissions[0]["admin"]["modules"]["sites"]["add"],
        role_details.permissions[0]["admin"]["modules"]["sites"]["edit"],
        role_details.permissions[0]["admin"]["modules"]["sites"]["delete"],
        role_details.permissions[0]["admin"]["modules"]["analytics"]["view"],
        role_details.permissions[0]["admin"]["modules"]["analytics"]["add"],
        role_details.permissions[0]["admin"]["modules"]["analytics"]["edit"],
        role_details.permissions[0]["admin"]["modules"]["analytics"]["delete"],
        role_details.permissions[0]["admin"]["modules"]["users"]["view"],
        role_details.permissions[0]["admin"]["modules"]["users"]["add"],
        role_details.permissions[0]["admin"]["modules"]["users"]["edit"],
        role_details.permissions[0]["admin"]["modules"]["users"]["delete"],
        role_details.permissions[0]["admin"]["modules"]["roles"]["view"],
        role_details.permissions[0]["admin"]["modules"]["roles"]["add"],
        role_details.permissions[0]["admin"]["modules"]["roles"]["edit"],
        role_details.permissions[0]["admin"]["modules"]["roles"]["delete"],
        role_details.permissions[0]["client"].access,
        role_details.permissions[0]["client"]["modules"]["planning"]["view"],
        role_details.permissions[0]["client"]["modules"]["maps"]["view"],
        role_details.permissions[0]["client"]["modules"]["audiences"]["view"],
        role_details.permissions[0]["client"]["modules"]["campaign"]["view"],]; 
        var resSql:any = await DBPG.query(sql, params);
  
        res.status(200).send({
          success: true
        })
      } else{
        res.status(400).send({
          success: false,
          error_message: "Insertion failed. No data provided."
        });
      }
    } catch(err){
      console.log(err);
      res.status(400).send({
        success: false,
        error_message: "Insertion failed."
      });
    }
  },

  async updateRole(req:Request, res:Response){
    var role_details = req.body;
    var id = req.query.id
    if(id){
      if(role_details){
        var sql = `UPDATE "roles" SET "role_name" = $1, "role_description" = $2, "status" = $3,
        "admin_access" = $4,
        "admin_sites_view" = $5,"admin_sites_add" = $6,"admin_sites_edit" = $7,"admin_sites_delete" = $8,
        "admin_analytics_view" = $9,"admin_analytics_add" = $10,"admin_analytics_edit" = $11,"admin_analytics_delete" = $12,
        "admin_users_view" = $13,"admin_users_add" = $14,"admin_users_edit" = $15,"admin_users_delete" = $16,
        "admin_roles_view" = $17,"admin_roles_add" = $18,"admin_roles_edit" = $19,"admin_roles_delete" = $20,
        "client_access" = $21,"client_planning_view" = $22,"client_maps_view" = $23,"client_audiences_view" = $24,"client_campaign_view" = $25
        WHERE role_id = $26;`;
        var params:any = [role_details.role_name, role_details.role_description, role_details.status,
        role_details.permissions[0]["admin"].access,
        role_details.permissions[0]["admin"]["modules"]["sites"]["view"],
        role_details.permissions[0]["admin"]["modules"]["sites"]["add"],
        role_details.permissions[0]["admin"]["modules"]["sites"]["edit"],
        role_details.permissions[0]["admin"]["modules"]["sites"]["delete"],
        role_details.permissions[0]["admin"]["modules"]["analytics"]["view"],
        role_details.permissions[0]["admin"]["modules"]["analytics"]["add"],
        role_details.permissions[0]["admin"]["modules"]["analytics"]["edit"],
        role_details.permissions[0]["admin"]["modules"]["analytics"]["delete"],
        role_details.permissions[0]["admin"]["modules"]["users"]["view"],
        role_details.permissions[0]["admin"]["modules"]["users"]["add"],
        role_details.permissions[0]["admin"]["modules"]["users"]["edit"],
        role_details.permissions[0]["admin"]["modules"]["users"]["delete"],
        role_details.permissions[0]["admin"]["modules"]["roles"]["view"],
        role_details.permissions[0]["admin"]["modules"]["roles"]["add"],
        role_details.permissions[0]["admin"]["modules"]["roles"]["edit"],
        role_details.permissions[0]["admin"]["modules"]["roles"]["delete"],
        role_details.permissions[0]["client"].access,
        role_details.permissions[0]["client"]["modules"]["planning"]["view"],
        role_details.permissions[0]["client"]["modules"]["maps"]["view"],
        role_details.permissions[0]["client"]["modules"]["audiences"]["view"],
        role_details.permissions[0]["client"]["modules"]["campaign"]["view"],
        id]; 
        var resSql:any = await DBPG.query(sql, params);

        res.status(200).send({
          success: true
        })
      } else{
        res.status(400).send({
          success: false,
          error_message: "Update failed. No data provided."
        });
      }
    } else{
      res.status(400).send({
        success: false,
        error_message: "Update failed. No role ID specified."
      });
    }

  },

  async updateRoleStatus(req:Request, res:Response){
    var role_details = req.body;
    var id = req.query.id
    if(id){
      if(role_details){
        var sql = `UPDATE "roles" SET status = $1
        WHERE role_id = $2`
        var params:any = [role_details["status"], id]
        var resSql:any = await DBPG.query(sql, params);
        res.status(200).send({
          success: true
        })
      } else{
        res.status(400).send({
          success: false,
          error_message: "Update failed. No data provided."
        });
      }
    } else{
      res.status(400).send({
        success: false,
        error_message: "Update failed. No role ID specified."
      });
    }
  },

  async deleteRole(req:Request, res:Response){
    
  },

};
