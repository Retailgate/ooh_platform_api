import e, { Request, Response } from 'express';
import * as SqlString from 'sqlstring';
import * as uuid from 'uuid';
import { DBPG } from '../db/db-pg';



export const DashboardController = {
  async getSiteData(req:Request, res:Response){
    var type = req.query.type;
    var count = req.query.count;
    var id = req.query.id;

    var sql = '';
    var params:any = [];
    var resSql:any;

    if(type){ // Retrieves only billboard sites with given type (classic || digital)
      console.log("type: ", type);
      
      sql = `SELECT "site_id", "site", "area", "region", "latitude", "longitude", "type", "imageURL" 
      FROM "sites"
      WHERE "type" = $1;` // `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;
      params = [type];
      resSql = await DBPG.query(sql, params);

      res.status(200).send(resSql);
      //res.status(200).send({"type": type});
    } else if(count === "true"){ // Retrieves the number of billboard sites per region
      console.log("count: ", count);

      sql = `SELECT "region", "type", COUNT("site_id") AS cnt 
      FROM "sites"
      GROUP BY "region", "type";` // `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;
      params = [];
      resSql = await DBPG.query(sql, params);

      var pre_data:any = {};
      var data:any = [];
      var index = 0;

      for(let row in resSql){
        if(!Object.keys(pre_data).includes(resSql[row].region)){
          pre_data[resSql[row].region] = {
            id: index,
            region: resSql[row].region,
            digital: 0,
            classic: 0
          }
          index += 1;
          if(resSql[row].type === "digital"){
            pre_data[resSql[row].region]["digital"] = resSql[row].cnt
          } else if(resSql[row].type === "classic"){
            pre_data[resSql[row].region]["classic"] = resSql[row].cnt
          }
        } else{
            if(resSql[row].type === "digital"){
              pre_data[resSql[row].region]["digital"] = resSql[row].cnt
            } else if(resSql[row].type === "classic"){
              pre_data[resSql[row].region]["classic"] = resSql[row].cnt
            }
        }
      }

      for(let entry in pre_data){
        data.push(pre_data[entry])
      }

      res.status(200).send(data);
      //res.status(200).send({"count": count});
    } else if(count === "false"){
        console.log("B");
        console.log("count: ", count);
        res.status(200).send([]);
    } else if(id){ //   - Retrieves a specific billboard site information based on <id>
      console.log("id: ", id);

      sql = `SELECT "site_id", "site", "area", "region", "site_owner", "type", "latitude", "longitude", 
      "category", "venue_type", "availability", "board_facing", "facing", "access_type" 
      FROM "sites";` // `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;
      params = [];
      resSql = await DBPG.query(sql, params);      

      res.status(200).send(resSql);
      //res.status(200).send({"id": id});
    } else{ // Retrieve all basic billboard sites information
      console.log("basic query");

      sql = `SELECT "site_id", "site", "area", "region", "latitude", "longitude", "type", "imageURL" 
      FROM "sites";` // `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;
      params = [];
      resSql = await DBPG.query(sql, params);

      res.status(200).send(resSql);
      //res.status(200).send({"response": "basic"});
    }
  }
};