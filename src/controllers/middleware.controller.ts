'use strict'

//import{ DB } from '../db/db'; 


import * as jwt from 'jsonwebtoken';
import * as SqlString from 'sqlstring';
// get config vars
import * as config from '../config/config';
import { DBPG } from '../db/db-pg';

// access config var
//process.env.TOKEN_SECRET;

//module.exports = {
export const Auth = {

    getToken:(username:any, email_address:any, password:any, res:any)=>{
        return new Promise(async (resolve, reject)=>{
            try{ 

                var sql = '';
                var params:any = [];
                var sqlCheckUser = '';
                var paramsCheckUser:any = [];
                if(username){
                  // Check if username exists
                  //sqlCheckUser = SqlString.format(`SELECT userName FROM users WHERE userName = $1;`,
                  //[username]);
                  sqlCheckUser = SqlString.format(`SELECT "userName" FROM "users" WHERE "userName" = $1;`);
                  paramsCheckUser = [username];
                  var resCheckUser:any = await DBPG.query(sqlCheckUser, paramsCheckUser);
                  if(!resCheckUser.length){
                    // Check if email address exists
                    //sqlCheckUser = SqlString.format(`SELECT emailAddress FROM users WHERE emailAddress = $1;`,
                    //[email_address]);
                    sqlCheckUser = SqlString.format(`SELECT "emailAddress" FROM "users" WHERE "emailAddress" = $1;`);
                    paramsCheckUser = [email_address];
                    var resCheckUser:any = await DBPG.query(sqlCheckUser, paramsCheckUser);
                    if(!resCheckUser.length){
                      resolve({"token": null, "error_message": "Account cannot be found"})
                    }
                    //sql = SqlString.format(`SELECT user_id, firstName, lastName, userName, emailAddress, password FROM users WHERE emailAddress = $1 AND password = $2;`, [email_address, password]);
                    sql = SqlString.format(`SELECT u."user_id", u."firstName", u."lastName", u."userName", u."emailAddress", p."password", u."role_id" FROM "users" AS u JOIN "password" AS p ON p.user_id = u.user_id WHERE u."emailAddress" = $1 AND p."password" = $2;`);
                    params = [email_address, password];
                  } else{
                    //sql = SqlString.format(`SELECT user_id, firstName, lastName, userName, emailAddress, password FROM users WHERE userName = $1 AND password = $2;`, [username, password]);
                    sql = SqlString.format(`SELECT u."user_id", u."firstName", u."lastName", u."userName", u."emailAddress", p."password", u."role_id" FROM "users" AS u JOIN "password" AS p ON p.user_id = u.user_id WHERE u."userName" = $1 AND p."password" = $2;`);
                    params = [username, password];
                  }
                } else if(email_address){
                  // Check if email address exists
                  //sqlCheckUser = SqlString.format(`SELECT emailAddress FROM users WHERE emailAddress = $1;`,
                  //[email_address]);
                  sqlCheckUser = SqlString.format(`SELECT "emailAddress" FROM "users" WHERE "emailAddress" = $1;`);
                  paramsCheckUser = [email_address];
                  var resCheckUser:any = await DBPG.query(sqlCheckUser, paramsCheckUser);
                  if(!resCheckUser.length){
                    // Check if username exists
                    //sqlCheckUser = SqlString.format(`SELECT userName FROM users WHERE userName = $1;`,
                    //[username]);
                    sqlCheckUser = SqlString.format(`SELECT "userName" FROM "users" WHERE "userName" = $1;`);
                    paramsCheckUser = [username];
                    var resCheckUser:any = await DBPG.query(sqlCheckUser, paramsCheckUser);
                    if(!resCheckUser.length){
                      resolve({"token": null, "error_message": "Account cannot be found"})
                    }
                    //sql = SqlString.format(`SELECT user_id, firstName, lastName, userName, emailAddress, password FROM users WHERE userName = $1 AND password = $2;`, [username, password]);
                    sql = SqlString.format(`SELECT u."user_id", u."firstName", u."lastName", u."userName", u."emailAddress", p."password", u."role_id" FROM "users" AS u JOIN "password" AS p ON p.user_id = u.user_id WHERE u."userName" = $1 AND p."password" = $2;`);
                    params = [username, password];
                  } else{
                    //sql = SqlString.format(`SELECT user_id, firstName, lastName, userName, emailAddress, password FROM users WHERE emailAddress = $1 AND password = $2;`, [email_address, password]);
                    sql = SqlString.format(`SELECT u."user_id", u."firstName", u."lastName", u."userName", u."emailAddress", p."password", u."role_id" FROM "users" AS u JOIN "password" AS p ON p.user_id = u.user_id WHERE u."emailAddress" = $1 AND p."password" = $2;`);
                    params = [email_address, password];
                  }
                }
                var result:any = await DBPG.query(sql, params);
                if(!result.length){
                  resolve({"token": null, "error_message": "You have entered a wrong password"});
                } 
                const data = JSON.parse(JSON.stringify(result[0]));
                //console.log(data); 
                const token = jwt.sign(data, config.env.TOKEN_SECRET, { expiresIn: '1d'});  

                //var sqlRoles = SqlString.format(`SELECT type FROM roles r JOIN accounts a ON a.account_id = r.account_id WHERE a.username = ? AND a.password = ?;`, [username, password])
                //var resultRoles:any = await DB.query(sqlRoles);
                //var roles:any = [];
                //for(let role in resultRoles){
                //  roles.push(resultRoles[role].type)
                //}

                resolve({
                  "token": token,
                  "id": result[0].user_id,
                  "first_name": result[0].firstName,
                  "last_name": result[0].lastName,
                  "username": result[0].userName,
                  "email_address": result[0].emailAddress,
                  "role_id": result[0].role_id
                });
                //resolve({"token": token, "roles": roles});
            }catch(err){ 
                //throw new Error(err);
                reject(err);
            }   
        });
    },

    verifyToken: async(req:any, res:any, next:any) => {
        try{
            const token = req.headers.authorization.split(' ')[1];
            const decoded:any = jwt.verify(
                token,
                config.env.TOKEN_SECRET
            ); 
            var sql = SqlString.format(`SELECT u."user_id", u."firstName", u."lastName", u."userName", u."emailAddress", p."password", u."role_id" 
            FROM "users" AS u 
            JOIN "password" AS p ON p.user_id = u.user_id 
            WHERE u."userName" = $1 AND p."password" = $2;`);
            var params = [decoded.userName,decoded.password]
            var result:any = await DBPG.query(sql, params); 
            if(!result.length){
                return res.status(401).send({error_message:"Unauthorized"});
            } 
            //req.userData = result[0];
            next();
        } catch (err) {  
            return res.status(401).send({error_message:"Session expired"});
        }
    }


};