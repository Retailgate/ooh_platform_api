import e, { Request, Response } from 'express';
import * as SqlString from 'sqlstring';
import * as uuid from 'uuid';
import { DBPG } from '../db/db-pg';
import { count } from 'console';
import moment from 'moment';
//import { parse } from 'path';



export const DashboardController = {
  async getSiteData(req:Request, res:Response){
    var type = req.query.type;
    var count = req.query.count;
    var id = req.query.id;
    var from:any = req.query.from;
    var to:any = req.query.to;

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
      "category", "venue_type", "availability", "board_facing", "facing", "access_type", "imageURL" 
      FROM "sites"
      WHERE "site_code" = $1;` // `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;
      params = [id];

      resSql = await DBPG.query(sql, params);

      var site_info:any = {};

      for(let row in resSql[0]){
        if(row === "site_id"){

        } else if(row === "site_code"){
          site_info["id"] = resSql[0][row];  
        } else if(row === "site"){
          site_info["name"] = resSql[0][row];  
        } else{
          site_info[row] = resSql[0][row];
        }
      }

      var reformatted_f_aud:any = [];
      var resDate:any;
      var formatted_from = '';
      var formatted_to = '';

      if(from && to){
        formatted_from = from.split("-")[2] + "-" + from.split("-")[0] + "-" + from.split("-")[1];
        formatted_to = to.split("-")[2] + "-" + to.split("-")[0] +  "-" +  to.split("-")[1];
        
        // Query count grouped by category, key, value
        var sqlDate = `SELECT "response_id", "value"
        FROM "surveys"
        WHERE key = 'date_collected' 
        AND "site_code" = $1
        AND TO_DATE("value", 'MM-DD-YY') >= $2 AND TO_DATE("value", 'MM-DD-YY') <= $3;`;
  
        var paramsDate = [id, formatted_from, formatted_to];
  
        resDate = await DBPG.query(sqlDate, paramsDate);

        //console.log("B: ", resDate);
      } else{
        // Query count grouped by category, key, value
        var sqlDate = `SELECT "response_id", "value"
        FROM "surveys"
        WHERE key = 'date_collected' 
        AND "site_code" = $1
        AND TO_DATE("value", 'MM-DD-YY') >= CURRENT_DATE - INTERVAL '30 DAYS' AND TO_DATE("value", 'MM-DD-YY') <= CURRENT_DATE - INTERVAL '1 DAY';`;
  
        var paramsDate = [id];
  
        resDate = await DBPG.query(sqlDate, paramsDate);
      }


      // Query count grouped by category, key, value
      var sqlAud = `SELECT s."response_id", s."category", s."key", o."value"
      FROM "surveys" s
      JOIN "options" o ON o."vcode" = s."value" AND o."key" = s."key"
      WHERE "site_code" = $1;`;

      var paramsAud = [id];

      var resAud:any = await DBPG.query(sqlAud, paramsAud);
      //console.log("A: ", resAud);
      var rid_arr:any = [];
      for(let row in resDate){
        rid_arr.push(resDate[row].response_id);
      }
      var filtered_aud:any = {};
      for(let row in resAud){
        if(rid_arr.includes(resAud[row].response_id)){ // Check if response_id is included in the list of responses for specified date range
          if(!Object.keys(filtered_aud).includes(resAud[row].category)){
            filtered_aud[resAud[row].category] = {};
            filtered_aud[resAud[row].category][resAud[row].key] = {}
            filtered_aud[resAud[row].category][resAud[row].key][resAud[row].value] = 1;
          } else {
            if(!Object.keys(filtered_aud[resAud[row].category]).includes(resAud[row].key)){
              filtered_aud[resAud[row].category][resAud[row].key] = {}
              filtered_aud[resAud[row].category][resAud[row].key][resAud[row].value] = 1;
            } else {
              if(!Object.keys(filtered_aud[resAud[row].category][resAud[row].key]).includes(resAud[row].value)){
                filtered_aud[resAud[row].category][resAud[row].key][resAud[row].value] = 1;
              } else {
                filtered_aud[resAud[row].category][resAud[row].key][resAud[row].value] += 1;
              }
            }
          }
        } else{
          // Do nothing
        }
      }
      // f_aud = filtered_aud 
      //var reformatted_f_aud:any = [];
      for(let category in filtered_aud){
        for(let key in filtered_aud[category]){
          for(let value in filtered_aud[category][key]){
            reformatted_f_aud.push({
              category,
              key,
              value,
              cnt: filtered_aud[category][key][value]
            });
          }
        }
      }


      /*} else{
      var cur_date = moment(new Date()).format("YYYY-MM-DD");
      console.log(cur_date);

      // Query count grouped by category, key, value
      var sqlAud = `SELECT s."category", s."key", o."value", COUNT(o."value") AS cnt
      FROM "surveys" s
      JOIN "options" o ON o."vcode" = s."value" AND o."key" = s."key"
      WHERE "site_code" = $1
      GROUP BY s."category", s."key", o."value";`;

      var paramsAud = [id];

      var resAud:any = await DBPG.query(sqlAud, paramsAud);

      console.log(resAud);
      reformatted_f_aud = [...resAud];
      }*/

      var raw_audience:any = {};
      for(let aud in reformatted_f_aud){
        if(!Object.keys(raw_audience).includes(reformatted_f_aud[aud].category)){
          raw_audience[reformatted_f_aud[aud].category] = {};
          raw_audience[reformatted_f_aud[aud].category][reformatted_f_aud[aud].key] = {};
          raw_audience[reformatted_f_aud[aud].category][reformatted_f_aud[aud].key][reformatted_f_aud[aud].value] = reformatted_f_aud[aud].cnt; 
        } else{
          if(!Object.keys(raw_audience[reformatted_f_aud[aud].category]).includes(reformatted_f_aud[aud].key)){
            raw_audience[reformatted_f_aud[aud].category][reformatted_f_aud[aud].key] = {};
            raw_audience[reformatted_f_aud[aud].category][reformatted_f_aud[aud].key][reformatted_f_aud[aud].value] = reformatted_f_aud[aud].cnt;
          } else{
            raw_audience[reformatted_f_aud[aud].category][reformatted_f_aud[aud].key][reformatted_f_aud[aud].value] = reformatted_f_aud[aud].cnt;
          }
        }
      }

      /*var raw_audience:any = {}; 
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
      }*/

      var audiences:any = [];
      var respo:any = [];
      for(let cat in raw_audience){
        for(let key in raw_audience[cat]){
          for(let val in raw_audience[cat][key]){
            respo.push({
              choice: val,
              count: raw_audience[cat][key][val]
            });
          }
          audiences.push({
            category: cat,
            question: key,
            responses: respo
          });
          respo = [];
        }
      }

      console.log(audiences);

      var final_data:any = {};

      // Get impressions using python script
      const { spawnSync } = require('child_process');
      //const pyProg = spawn('python', ['/home/ubuntu/ooh_platform_python/script.py']);
      const pyProg = spawnSync('python3', ['/home/ubuntu/ooh_platform_python/predict.py']);
      console.log("HERE");

      //console.log(pyProg.output.toString().replace(/'/g, '"').slice(1,-1));
      var parsed_data = JSON.parse(pyProg.output.toString().replace(/'/g, '"').slice(1,-1));

      final_data = {
        ...site_info,
        analytics: { 
        ...parsed_data,
        audiences
        }
      }
      res.status(200).send(final_data);      

      /*final_data = {
        ...resSql[0],
        audience
      }
      
      res.status(200).send(final_data);*/
      //res.status(200).send({"id": id});
      //res.status(200).send([]);
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
      //var cur_date = moment(new Date()).format("YYYY-MM-DD")
      //console.log(cur_date);
       
      /*// Retrieve impressions per Area
      var sqlGen = `SELECT op."value" AS area, COUNT(su.survey_id) AS cnt 
      FROM "surveys" su
      JOIN "options" op ON op.vcode = su.value AND op."key" = su."key"
      WHERE su."key" = 'area'
      GROUP BY op."value"; `;
      var paramsGen:any = [];
      var resGen:any = await DBPG.query(sqlGen, paramsGen);

      var areaCnt:any = {};
      for(let cnt in resGen){
        areaCnt[resGen[cnt].area] = resGen[cnt].cnt;
      }*/      
      if(options){
        // Retrieve data for all areas taking the filters into consideration
        var parsed_options = JSON.parse(options);
        //console.log(parsed_options["age_group"]);
        option_str += `SELECT su."response_id", si."site", si."area", si."region", su."category", su."key", su."value" AS code, op."value" AS value
        FROM "surveys" su
        JOIN "sites" si ON si."site_code" = su."site_code"
        LEFT JOIN "options" op ON op.vcode = su.value AND op."key" = su."key"
        WHERE su."key" = 'area'`;
        var opt_cnt = 0;
        var opt_arr:any = ["area"]; // WIll be used in checking if respondend fits all filter
        var formatted_datefrom = '';
        var formatted_dateto = '';
        for(let opt in parsed_options){
          /*if(!opt_cnt){
            if(Object.keys(parsed_options).length > 1){
              option_str += `"key" = '` + opt +  `' AND "value" IN (SELECT "vcode" FROM "options" WHERE "value" = '` + parsed_options[opt] + `')`
            } else{
              option_str += `"key" = '` + opt +  `' AND "value" IN (SELECT "vcode" FROM "options" WHERE "value" = '` + parsed_options[opt] + `');`
            }
            opt_cnt += 1;
          } else{
            option_str += ` OR ` + `"key" = '` + opt +  `' AND "value" IN (SELECT "vcode" FROM "options" WHERE "value" = '` + parsed_options[opt] + `');`
          }*/
  
          if(Object.keys(parsed_options).length > 1){
            if(opt === "dates"){ // dates key is a special case since its value is another object ({"from":"MM-DD-YYYY","to":"MM-DD-YYYY"}) instead of string
              formatted_datefrom = parsed_options[opt]["from"].split("-")[2] + "-" + parsed_options[opt]["from"].split("-")[0] + "-" + parsed_options[opt]["from"].split("-")[1];
              formatted_dateto = parsed_options[opt]["to"].split("-")[2] + "-" + parsed_options[opt]["to"].split("-")[0] +  "-" +  parsed_options[opt]["to"].split("-")[1];
  
              option_str += ` OR ` + `su."key" = 'date_collected' AND TO_DATE(su."value", 'MM-DD-YY') >= '` + formatted_datefrom + `' AND TO_DATE(su."value", 'MM-DD-YY') <= '` + formatted_dateto + `'`
            } else{
              if(!Array.isArray(parsed_options[opt])){
                option_str += ` OR ` + `su."key" = '` + opt +  `' AND su."value" IN (SELECT "vcode" FROM "options" WHERE "value" = '` + parsed_options[opt] + `')`
              } else {
                for(let el in parsed_options[opt]){
                  option_str += ` OR ` + `su."key" = '` + opt +  `' AND su."value" IN (SELECT "vcode" FROM "options" WHERE "value" = '` + parsed_options[opt][el] + `')`    
                }
              }
            }
          } else{
            if(opt === "dates"){
              formatted_datefrom = parsed_options[opt]["from"].split("-")[2] + "-" + parsed_options[opt]["from"].split("-")[0] + "-" + parsed_options[opt]["from"].split("-")[1];
              formatted_dateto = parsed_options[opt]["to"].split("-")[2] + "-" + parsed_options[opt]["to"].split("-")[0] +  "-" +  parsed_options[opt]["to"].split("-")[1];
  
              option_str += ` OR ` + `su."key" = 'date_collected' AND TO_DATE(su."value", 'MM-DD-YY') >= '` + formatted_datefrom + `' AND TO_DATE(su."value", 'MM-DD-YY') <= '` + formatted_dateto + `';`
            } else{
              if(!Array.isArray(parsed_options[opt])){
                option_str += ` OR ` + `su."key" = '` + opt +  `' AND su."value" IN (SELECT "vcode" FROM "options" WHERE "value" = '` + parsed_options[opt] + `');`
              } else{
                for(let el in parsed_options[opt]){
                  option_str += ` OR ` + `su."key" = '` + opt +  `' AND su."value" IN (SELECT "vcode" FROM "options" WHERE "value" = '` + parsed_options[opt][el] + `');`
                }
              }
            }
          }
          if(opt === "dates"){
            opt_arr.push("date_collected")
          } else{
            opt_arr.push(opt);
          }
        }
  
        console.log(option_str);
        params = [];
        resSql = await DBPG.query(option_str, params);
        //console.log(resSql);
  
        // Segregate data by site, then by response_id (<household id>_<individual id>)
        var processed_data:any = {};
        
        for(let row in resSql){
          if(!Object.keys(processed_data).includes(resSql[row].response_id)){
            processed_data[resSql[row].response_id] = {};
            processed_data[resSql[row].response_id]["site"] = resSql[row].site;
            //processed_data[resSql[row].response_id]["area"] = resSql[row].area;
            processed_data[resSql[row].response_id]["region"] = resSql[row].region;
            if(resSql[row].key === "area"){
              processed_data[resSql[row].response_id][resSql[row].key] = resSql[row].value
            } else {
              processed_data[resSql[row].response_id][resSql[row].key] = 1
            }
          } else{
            processed_data[resSql[row].response_id]["site"] = resSql[row].site;
            //processed_data[resSql[row].response_id]["area"] = resSql[row].area;
            processed_data[resSql[row].response_id]["region"] = resSql[row].region;
            if(resSql[row].key === "area"){
              processed_data[resSql[row].response_id][resSql[row].key] = resSql[row].value
            } else {
              processed_data[resSql[row].response_id][resSql[row].key] = 1
            }
          }
        }
  
        var count_data:any = {};
        var data:any = [];
        var opt_match = 0;
        var fit_response = 0;
        var id = 0;
        var cur_area = '';
        var cur_site = '';
        var cur_region = '';
  
        for(let rid in processed_data){
          for(let opt in opt_arr){
            /*if(opt_arr[opt] === "dates"){
              opt_match += 1;
            }*/
            if(processed_data[rid][opt_arr[opt]]){
              if(opt_arr[opt] === "area"){
                cur_area = processed_data[rid][opt_arr[opt]];
              }
              cur_site = processed_data[rid]["site"];
              cur_region = processed_data[rid]["region"];
              opt_match += 1;
            }
          }
          if(opt_match == opt_arr.length){
            if(!Object.keys(count_data).includes(cur_area)){
              count_data[cur_area] = {
                id,
                site: cur_site,
                area: cur_area,
                region: cur_region,
                fits_no: 1
              };
              id += 1;
              cur_site = '';
              cur_region = '';
            } else{
              count_data[cur_area]["fits_no"] += 1;
            }
            cur_area = '';
          }
          opt_match = 0;
        }
  
        /*for(let entry in count_data){
          count_data[entry]["fits_rate"] = parseFloat((count_data[entry]["fits_no"] / areaCnt[entry]).toFixed(2)); 
        }*/
  
  
  
        // Retrieve date per response_id (for getting average monthly impressions)
        var sqlDates = `SELECT "response_id", TO_DATE("value", 'MM-DD-YY') AS date
        FROM "surveys"
        WHERE "key" = 'date_collected'
        AND TO_DATE("value", 'MM-DD-YY') >= $1 AND TO_DATE("value", 'MM-DD-YY') <= $2;`
        var paramsDates:any = [formatted_datefrom, formatted_dateto];
        var resDates:any = await DBPG.query(sqlDates, paramsDates);
  
        //console.log(resDates);
        // Retrieve area per response_id (for getting average monthly impressions)
        var sqlAreas = `SELECT "response_id", op."value"
        FROM "surveys" su
        JOIN "options" op ON op.vcode = su.value AND op."key" = su."key"
        WHERE su."key" = 'area';`;
        var paramsAreas:any = [];
        var resAreas:any = await DBPG.query(sqlAreas, paramsAreas);
  
        var areaObj:any = {};
        for(let area in resAreas){
          areaObj[resAreas[area].response_id] = resAreas[area].value; 
        }
  
        //console.log(resAreas);
        // Collect response_id of response per area with date entry
        var area_per_month:any = {};
        for(let entry in resDates){
          console.log(moment(resDates[entry].date).format("YYYY-MM-DD"));
          if(Object.keys(areaObj).includes(resDates[entry].response_id)){
  
            if(!Object.keys(area_per_month).includes(areaObj[resDates[entry].response_id])){
              area_per_month[areaObj[resDates[entry].response_id]] = {};
              area_per_month[areaObj[resDates[entry].response_id]][moment(resDates[entry].date).format("YYYY-MM-DD").slice(0,7)] = 1;
              /*if(!Object.keys(area_per_month[areaObj[resDates[entry].response_id]]).includes(moment(resDates[entry].date).format("YYYY-MM-DD").slice(0,7))){
                area_per_month[areaObj[resDates[entry].response_id]][moment(resDates[entry].date).format("YYYY-MM-DD").slice(0,7)] = 1;
              } else {
                area_per_month[areaObj[resDates[entry].response_id]][moment(resDates[entry].date).format("YYYY-MM-DD").slice(0,7)] += 1;
              }*/
            } else{
              if(!Object.keys(area_per_month[areaObj[resDates[entry].response_id]]).includes(moment(resDates[entry].date).format("YYYY-MM-DD").slice(0,7))){
                area_per_month[areaObj[resDates[entry].response_id]][moment(resDates[entry].date).format("YYYY-MM-DD").slice(0,7)] = 1;
              } else {
                area_per_month[areaObj[resDates[entry].response_id]][moment(resDates[entry].date).format("YYYY-MM-DD").slice(0,7)] += 1;
              }
            }
          
          }
  
        }
  
        console.log(area_per_month);
        
        var areaTally:any = {};
        for(let area in area_per_month){
          if(!Object.keys(areaTally).includes(area)){
            areaTally[area] = {
              "total": 0,
              "count": 0,
            };
            for(let date in area_per_month[area]){
              areaTally[area]["total"] += area_per_month[area][date];
              areaTally[area]["count"] += 1;
            }
          } else{
            for(let date in area_per_month[area]){
              areaTally[area]["total"] += area_per_month[area][date];
              areaTally[area]["count"] += 1;
            }
          }
        }
  
        for(let area in areaTally){
          areaTally[area]["mean"] = areaTally[area]["total"] / areaTally[area]["count"]; 
        }
  
        console.log(areaTally);
  
        for(let entry in count_data){
          count_data[entry]["fits_rate"] = parseFloat(((count_data[entry]["fits_no"] * 100) / areaTally[entry]["total"]).toFixed(2)); 
          count_data[entry]["avg_monthly_impressions"] = areaTally[entry]["mean"];
        }
  
        /*for(let row in resSql){
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
        }*/
  
        //console.log(resSql);
        res.status(200).send(count_data);
      } else {
        option_str += `SELECT su."response_id", si."site", si."area", si."region", su."category", su."key", su."value" AS code, op."value" AS value
        FROM "surveys" su
        JOIN "sites" si ON si."site_code" = su."site_code"
        LEFT JOIN "options" op ON op.vcode = su.value AND op."key" = su."key"
        WHERE su."key" = 'area';`;
        var opt_cnt = 0;
        var opt_arr:any = ["area"]; // WIll be used in checking if respondend fits all filter
        var formatted_datefrom = '';
        var formatted_dateto = '';

        console.log(option_str);
        params = [];
        resSql = await DBPG.query(option_str, params);

        console.log(resSql);
        // Segregate data by site, then by response_id (<household id>_<individual id>)
        var processed_data:any = {};
        
        for(let row in resSql){
          if(!Object.keys(processed_data).includes(resSql[row].response_id)){
            processed_data[resSql[row].response_id] = {};
            processed_data[resSql[row].response_id]["site"] = resSql[row].site;
            //processed_data[resSql[row].response_id]["area"] = resSql[row].area;
            processed_data[resSql[row].response_id]["region"] = resSql[row].region;
            if(resSql[row].key === "area"){
              processed_data[resSql[row].response_id][resSql[row].key] = resSql[row].value
            } else {
              processed_data[resSql[row].response_id][resSql[row].key] = 1
            }
          } else{
            processed_data[resSql[row].response_id]["site"] = resSql[row].site;
            //processed_data[resSql[row].response_id]["area"] = resSql[row].area;
            processed_data[resSql[row].response_id]["region"] = resSql[row].region;
            if(resSql[row].key === "area"){
              processed_data[resSql[row].response_id][resSql[row].key] = resSql[row].value
            } else {
              processed_data[resSql[row].response_id][resSql[row].key] = 1
            }
          }
        }
  
        var count_data:any = {};
        var data:any = [];
        var opt_match = 0;
        var fit_response = 0;
        var id = 0;
        var cur_area = '';
        var cur_site = '';
        var cur_region = '';

        console.log(processed_data);
  
        for(let rid in processed_data){
          for(let opt in opt_arr){
            /*if(opt_arr[opt] === "dates"){
              opt_match += 1;
            }*/
            if(processed_data[rid][opt_arr[opt]]){
              if(opt_arr[opt] === "area"){
                cur_area = processed_data[rid][opt_arr[opt]];
              }
              cur_site = processed_data[rid]["site"];
              cur_region = processed_data[rid]["region"];
              opt_match += 1;
            }
          }
          if(opt_match == opt_arr.length){
            if(!Object.keys(count_data).includes(cur_area)){
              count_data[cur_area] = {
                id,
                site: cur_site,
                area: cur_area,
                region: cur_region,
                fits_no: 1
              };
              id += 1;
              cur_site = '';
              cur_region = '';
            } else{
              count_data[cur_area]["fits_no"] += 1;
            }
            cur_area = '';
          }
          opt_match = 0;
        }
  
        /*for(let entry in count_data){
          count_data[entry]["fits_rate"] = parseFloat((count_data[entry]["fits_no"] / areaCnt[entry]).toFixed(2)); 
        }*/
  
  
  
        // Retrieve date per response_id (for getting average monthly impressions)
        var sqlDates = `SELECT "response_id", TO_DATE("value", 'MM-DD-YY') AS date
        FROM "surveys"
        WHERE "key" = 'date_collected';`
        var paramsDates:any = [];
        var resDates:any = await DBPG.query(sqlDates, paramsDates);
  
        //console.log(resDates);
        // Retrieve area per response_id (for getting average monthly impressions)
        var sqlAreas = `SELECT "response_id", op."value"
        FROM "surveys" su
        JOIN "options" op ON op.vcode = su.value AND op."key" = su."key"
        WHERE su."key" = 'area';`;
        var paramsAreas:any = [];
        var resAreas:any = await DBPG.query(sqlAreas, paramsAreas);
  
        var areaObj:any = {};
        for(let area in resAreas){
          areaObj[resAreas[area].response_id] = resAreas[area].value; 
        }
  
        //console.log(resAreas);
        // Collect response_id of response per area with date entry
        var area_per_month:any = {};
        for(let entry in resDates){
          console.log(moment(resDates[entry].date).format("YYYY-MM-DD"));
          if(Object.keys(areaObj).includes(resDates[entry].response_id)){
  
            if(!Object.keys(area_per_month).includes(areaObj[resDates[entry].response_id])){
              area_per_month[areaObj[resDates[entry].response_id]] = {};
              area_per_month[areaObj[resDates[entry].response_id]][moment(resDates[entry].date).format("YYYY-MM-DD").slice(0,7)] = 1;
              /*if(!Object.keys(area_per_month[areaObj[resDates[entry].response_id]]).includes(moment(resDates[entry].date).format("YYYY-MM-DD").slice(0,7))){
                area_per_month[areaObj[resDates[entry].response_id]][moment(resDates[entry].date).format("YYYY-MM-DD").slice(0,7)] = 1;
              } else {
                area_per_month[areaObj[resDates[entry].response_id]][moment(resDates[entry].date).format("YYYY-MM-DD").slice(0,7)] += 1;
              }*/
            } else{
              if(!Object.keys(area_per_month[areaObj[resDates[entry].response_id]]).includes(moment(resDates[entry].date).format("YYYY-MM-DD").slice(0,7))){
                area_per_month[areaObj[resDates[entry].response_id]][moment(resDates[entry].date).format("YYYY-MM-DD").slice(0,7)] = 1;
              } else {
                area_per_month[areaObj[resDates[entry].response_id]][moment(resDates[entry].date).format("YYYY-MM-DD").slice(0,7)] += 1;
              }
            }
          
          }
  
        }
  
        console.log(area_per_month);
        
        var areaTally:any = {};
        for(let area in area_per_month){
          if(!Object.keys(areaTally).includes(area)){
            areaTally[area] = {
              "total": 0,
              "count": 0,
            };
            for(let date in area_per_month[area]){
              areaTally[area]["total"] += area_per_month[area][date];
              areaTally[area]["count"] += 1;
            }
          } else{
            for(let date in area_per_month[area]){
              areaTally[area]["total"] += area_per_month[area][date];
              areaTally[area]["count"] += 1;
            }
          }
        }
  
        for(let area in areaTally){
          areaTally[area]["mean"] = areaTally[area]["total"] / areaTally[area]["count"]; 
        }
  
        console.log(areaTally);
  
        for(let entry in count_data){
          count_data[entry]["fits_rate"] = parseFloat(((count_data[entry]["fits_no"] * 100 ) / areaTally[entry]["total"]).toFixed(2)); 
          count_data[entry]["avg_monthly_impressions"] = areaTally[entry]["mean"];
        }
        res.status(200).send(count_data);
      }
    }
  }
};