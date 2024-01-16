import e, { Request, Response } from 'express';
import * as SqlString from 'sqlstring';
import * as uuid from 'uuid';
import { DBPG } from '../db/db-pg';
import { parse } from 'path';



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

      sql = `SELECT "site_id", "site_code", "site", "area", "region", "site_owner", "type", "latitude", "longitude", 
      "category", "venue_type", "availability", "board_facing", "facing", "access_type" 
      FROM "sites"
      WHERE "site_code" = $1;` // `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;
      params = [id];

      resSql = await DBPG.query(sql, params);

      var sqlAud = `SELECT s."category", s."key", o."value", COUNT(o."value") AS cnt
      FROM "surveys" s
      JOIN "options" o ON o."vcode" = s."value" AND o."key" = s."key"
      WHERE "site_code" = $1
      GROUP BY s."category", s."key", o."value";`;

      var paramsAud = [id];

      var resAud:any = await DBPG.query(sqlAud, paramsAud);

      var raw_audience:any = {}; 
      for(let aud in resAud){
        if(!Object.keys(raw_audience).includes(resAud[aud].category)){
          raw_audience[resAud[aud].category] = {};
          raw_audience[resAud[aud].category][resAud[aud].key] = {};
          raw_audience[resAud[aud].category][resAud[aud].key][resAud[aud].value] = resAud[aud].cnt; 
        } else{
          if(!Object.keys(raw_audience[resAud[aud].category]).includes(resAud[aud].key)){
            raw_audience[resAud[aud].category][resAud[aud].key] = {};
            raw_audience[resAud[aud].category][resAud[aud].key][resAud[aud].value] = resAud[aud].cnt;
          } else{
            raw_audience[resAud[aud].category][resAud[aud].key][resAud[aud].value] = resAud[aud].cnt;
          }
        }
      }

      var audience:any = [];
      var respo:any = [];
      for(let cat in raw_audience){
        for(let key in raw_audience[cat]){
          for(let val in raw_audience[cat][key]){
            respo.push({
              choice: val,
              count: raw_audience[cat][key][val]
            });
          }
          audience.push({
            category: cat,
            question: key,
            responses: respo
          });
          respo = [];
        }
      }

      var final_data:any = {};

      // Get impressions using python script
      const { spawn } = require('child_process');
      //const pyProg = spawn('python', ['/home/ubuntu/ooh_platform_python/script.py']);
      const pyProg = spawn('python3', ['/home/ubuntu/ooh_platform_python/predict.py']);
  
      pyProg.stdout.on('data', function(data:any) {
  
        console.log(JSON.stringify(JSON.parse(data.toString())));
        var parsed_data = JSON.parse(data.toString());
        final_data = {
          ...resSql[0],
          ...parsed_data,
          audience
        }

        res.status(200).send(final_data);
      }); 

      /*final_data = {
        ...resSql[0],
        audience
      }

      res.status(200).send(final_data);*/
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
  },

  async planning(req:Request, res:Response){
    var query = req.query.get;
    var options:any = req.query.options;

    var sql = '';
    var params:any = [];
    var resSql:any;
    var option_str = '';

    if(query === "demographics"){ // Retrieve list of demographics for profile wishlist
      sql = `SELECT "category", "key", "value" 
      FROM "options"
      WHERE "category" != 'Profile';` // `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;
      params = [];
      resSql = await DBPG.query(sql, params);

      var data:any = [];
      for(let row in resSql){
        data.push({
          category: resSql[row].category,
          question: resSql[row].key,
          key: resSql[row].value
        })
      }
      res.status(200).send(data);
    } else if(query === "areas"){ // Retrieve the list of areas based on the set options
      //if(options){
      var parsed_options = JSON.parse(options);
      console.log(parsed_options["age_group"]);
      option_str += `SELECT su."response_id", si."site", si."area", si."region", su."category", su."key", su."value"
      FROM "surveys" su
      JOIN "sites" si ON si."site_code" = su."site_code"
      WHERE `;
      var opt_cnt = 0;
      var opt_arr:any = []; // WIll be used in checking if respondend fits all filter
      for(let opt in parsed_options){
        if(!opt_cnt){
          if(Object.keys(parsed_options).length > 1){
            option_str += `"key" = '` + opt +  `' AND "value" IN (SELECT "vcode" FROM "options" WHERE "value" = '` + parsed_options[opt] + `')`
          } else{
            option_str += `"key" = '` + opt +  `' AND "value" IN (SELECT "vcode" FROM "options" WHERE "value" = '` + parsed_options[opt] + `');`
          }
          opt_cnt += 1;
        } else{
          option_str += ` OR ` + `"key" = '` + opt +  `' AND "value" IN (SELECT "vcode" FROM "options" WHERE "value" = '` + parsed_options[opt] + `');`
        }

        opt_arr.push(opt);
      }

      console.log(option_str);
      params = [];
      resSql = await DBPG.query(option_str, params);
      console.log(resSql);

      // Segregate data by site, then by response_id (<household id>_<individual id>)
      var processed_data:any = {};
      for(let row in resSql){
        if(!Object.keys(processed_data).includes(resSql[row].site)){
          processed_data[resSql[row].site] = {};
          processed_data[resSql[row].site]["area"] = resSql[row].area;
          processed_data[resSql[row].site]["region"] = resSql[row].region;
          processed_data[resSql[row].site][resSql[row].response_id] = {};
          processed_data[resSql[row].site][resSql[row].response_id][resSql[row].key] = 1;
        } else{
          if(!Object.keys(processed_data[resSql[row].site]).includes(resSql[row].response_id)){
            processed_data[resSql[row].site][resSql[row].response_id] = {};
            processed_data[resSql[row].site][resSql[row].response_id][resSql[row].key] = 1;
          } else{
            processed_data[resSql[row].site][resSql[row].response_id][resSql[row].key] = 1;
          }
        }      
      }

      var count_data:any = {};
      var data:any = []
      var opt_match = 0;
      var fit_response = 0;
      var id = 0;
      // Count fits per area
      for(let site in processed_data){
        for(let rid in processed_data[site]){
          if(processed_data[site][rid] !== "area" && processed_data[site][rid] !== "region"){
            for(let opt in opt_arr){ // check if options fit respondent
              if(processed_data[site][rid][opt_arr[opt]]){
                opt_match += 1;
              }
            }
            if(opt_match == opt_arr.length){
              fit_response += 1;
            }
            opt_match = 0; // Reset count of options/filters matched
          }
        }
        data.push({
          id,
          site,
          area: processed_data[site]["area"],
          region: processed_data[site]["region"],
          fits_no: fit_response
        })
        id += 1;
        fit_response = 0;
      }

      console.log(processed_data);
      res.status(200).send(data);
    /*} else{
      res.status(200).send([
        {
          id: 0,
          site: "",
          area: "",
          region: "",
          fits_no: 0,
          fits_rate: 0.0,
          avg_monthly_impressions: 0,
        },
      ]);
    }*/
    }
  }
};