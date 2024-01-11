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
  }

};
