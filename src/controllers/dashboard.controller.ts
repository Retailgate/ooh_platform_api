import e, { Request, Response } from "express";
import * as SqlString from "sqlstring";
import * as uuid from "uuid";
import { DBPG } from "../db/db-pg";
//import { count } from 'console';
import moment from "moment";
//import { parse } from 'path';

export const DashboardController = {
  async test(req: Request, res: Response) {
    res.status(200).send({
      success: true,
    });
  },

  async getSiteData(req: Request, res: Response) {
    var type = req.query.type;
    var count = req.query.count;
    var id = req.query.id;
    var area_code: any;
    var from: any = req.query.from;
    var to: any = req.query.to;

    var sql = "";
    var params: any = [];
    var resSql: any;

    if (type) {
      // Retrieves only billboard sites with given type (classic || digital)
      console.log("type: ", type);

      sql = `SELECT "site_id", "site_code", "site", "area", "city", "size", "segments", "region", "latitude", "longitude", "type", "price", "ideal_view", "imageURL" 
      FROM "sites"
      WHERE "type" = $1;`; // `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;
      params = [type];
      resSql = await DBPG.query(sql, params);

      res.status(200).send(resSql);
      //res.status(200).send({"type": type});
    } else if (count === "true") {
      // Retrieves the number of billboard sites per region
      console.log("count: ", count);

      sql = `SELECT "region", "type", COUNT("site_id") AS cnt 
      FROM "sites"
      GROUP BY "region", "type";`; // `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;
      params = [];
      resSql = await DBPG.query(sql, params);

      var pre_data: any = {};
      var data: any = [];
      var index = 0;

      for (let row in resSql) {
        if (!Object.keys(pre_data).includes(resSql[row].region)) {
          pre_data[resSql[row].region] = {
            id: index,
            region: resSql[row].region,
            digital: 0,
            classic: 0,
            banner: 0,
          };
          index += 1;
          if (resSql[row].type === "digital") {
            pre_data[resSql[row].region]["digital"] = resSql[row].cnt;
          } else if (resSql[row].type === "classic") {
            pre_data[resSql[row].region]["classic"] = resSql[row].cnt;
          } else if (resSql[row].type === "banner") {
            pre_data[resSql[row].region]["banner"] = resSql[row].cnt;
          }
        } else {
          if (resSql[row].type === "digital") {
            pre_data[resSql[row].region]["digital"] = resSql[row].cnt;
          } else if (resSql[row].type === "classic") {
            pre_data[resSql[row].region]["classic"] = resSql[row].cnt;
          } else if (resSql[row].type === "banner") {
            pre_data[resSql[row].region]["banner"] = resSql[row].cnt;
          }
        }
      }

      for (let entry in pre_data) {
        data.push(pre_data[entry]);
      }

      res.status(200).send(data);
      //res.status(200).send({"count": count});
    } else if (count === "false") {
      console.log("B");
      console.log("count: ", count);
      res.status(200).send([]);
    } else if (id) {
      //   - Retrieves a specific billboard site information based on <id>
      console.log("id: ", id);
      if (!from && !to) {
        sql = `SELECT "site_id", "site_code", "site", "area", "city", "size", "segments", "region", 
        "site_owner", "type", "latitude", "longitude", 
        "board_facing", "facing", "access_type", "price", "ideal_view", "imageURL" 
        FROM "sites"
        WHERE "site_code" = $1;`;
        params = [id];

        resSql = await DBPG.query(sql, params);
        //area_code = resSql[0]['area'];

        var site_info: any = {};

        for (let row in resSql[0]) {
          if (row !== "site_id") {
            if (row === "site_code") {
              site_info["id"] = resSql[0][row];
            } else if (row === "site") {
              site_info["name"] = resSql[0][row];
            } else {
              site_info[row] = resSql[0][row];
            }
          }
        }

        var final_data: any = {
          ...site_info,
        };

        res.status(200).send(final_data);
      } else {
        //TODO Get MMDA Data (Annual Average Daily Traffic)
        //Get current year
        var cur_date = new Date();
        var cur_year = cur_date.getFullYear();
        console.log(cur_year);

        var sqlMMDA = `SELECT "site_code", "year", "ave_daily", "ave_weekly", "ave_monthly"
      FROM "mmda_data"
      WHERE "site_code" = $1
      AND "year" = $2;`;
        var paramsMMDA: any = [id, cur_year]; // change to id

        var resMMDA: any = await DBPG.query(sqlMMDA, paramsMMDA);

        //   //"category", "venue_type", "availability",
        //   sql = `SELECT "site_id", "site_code", "site", "area", "city", "size", "segments", "region",
        // "site_owner", "type", "latitude", "longitude",
        // "board_facing", "facing", "access_type", "price", "ideal_view", "imageURL"
        // FROM "sites"
        // WHERE "site_code" = $1;`;
        //   params = [id];

        //   resSql = await DBPG.query(sql, params);

        // var site_info: any = {};

        // for (let row in resSql[0]) {
        //   if (row !== "site_id") {
        //     if (row === "site_code") {
        //       site_info["id"] = resSql[0][row];
        //     } else if (row === "site") {
        //       site_info["name"] = resSql[0][row];
        //     } else {
        //       site_info[row] = resSql[0][row];
        //     }
        //   }
        // }

        // var reformatted_f_aud: any = [];
        var resDate: any;
        var formatted_from = "";
        var formatted_to = "";

        if (from && to) {
          var from_f = from.split("-");
          var to_f = to.split("-");

          formatted_from = from_f[2] + "-" + from_f[0] + "-" + from_f[1];
          formatted_to = to_f[2] + "-" + to_f[0] + "-" + to_f[1];

          // Query count grouped by category, key, value
          var sqlDate = `SELECT "response_id", "value"
        FROM "surveys"
        WHERE key = 'date_collected'
        AND "site_code" = $1
        AND TO_DATE("value", 'MM-DD-YY') >= $2 AND TO_DATE("value", 'MM-DD-YY') <= $3;`;

          var paramsDate = [id, formatted_from, formatted_to]; //change to id

          resDate = await DBPG.query(sqlDate, paramsDate);

          //console.log("B: ", resDate);
        }
        //else {
        //   // Query count grouped by category, key, value
        //   var sqlDate = `SELECT "response_id", "value"
        //   FROM "surveys"
        //   WHERE key = 'date_collected'
        //   AND "site_code" = $1
        //   AND TO_DATE("value", 'MM-DD-YY') >= CURRENT_DATE - INTERVAL '30 DAYS' AND TO_DATE("value", 'MM-DD-YY') <= CURRENT_DATE - INTERVAL '1 DAY';`;

        //   var paramsDate = [id]; //change to id

        //   resDate = await DBPG.query(sqlDate, paramsDate);
        // }

        // // Query count grouped by category, key, value
        // var sqlAud = `SELECT s."response_id", s."category", s."key", o."value"
        // FROM "surveys" s
        // JOIN "options" o ON o."vcode" = s."value" AND o."key" = s."key"
        // WHERE "site_code" = $1;`;

        // var paramsAud = [id]; //change to id

        // var resAud: any = await DBPG.query(sqlAud, paramsAud);
        // //console.log("A: ", resAud);
        // var rid_arr: any = [];
        // for (let row in resDate) {
        //   rid_arr.push(resDate[row].response_id);
        // }
        // var filtered_aud: any = {};
        // for (let row in resAud) {
        //   if (rid_arr.includes(resAud[row].response_id)) {
        //     // Check if response_id is included in the list of responses for specified date range
        //     if (!Object.keys(filtered_aud).includes(resAud[row].category)) {
        //       filtered_aud[resAud[row].category] = {};
        //       filtered_aud[resAud[row].category][resAud[row].key] = {};
        //       filtered_aud[resAud[row].category][resAud[row].key][
        //         resAud[row].value
        //       ] = 1;
        //     } else {
        //       if (
        //         !Object.keys(filtered_aud[resAud[row].category]).includes(
        //           resAud[row].key
        //         )
        //       ) {
        //         filtered_aud[resAud[row].category][resAud[row].key] = {};
        //         filtered_aud[resAud[row].category][resAud[row].key][
        //           resAud[row].value
        //         ] = 1;
        //       } else {
        //         if (
        //           !Object.keys(
        //             filtered_aud[resAud[row].category][resAud[row].key]
        //           ).includes(resAud[row].value)
        //         ) {
        //           filtered_aud[resAud[row].category][resAud[row].key][
        //             resAud[row].value
        //           ] = 1;
        //         } else {
        //           filtered_aud[resAud[row].category][resAud[row].key][
        //             resAud[row].value
        //           ] += 1;
        //         }
        //       }
        //     }
        //   } else {
        //     // Do nothing
        //   }
        // }
        // f_aud = filtered_aud
        //var reformatted_f_aud:any = [];

        // for (let category in filtered_aud) {
        //   for (let key in filtered_aud[category]) {
        //     for (let value in filtered_aud[category][key]) {
        //       reformatted_f_aud.push({
        //         category,
        //         key,
        //         value,
        //         cnt: filtered_aud[category][key][value],
        //       });
        //     }
        //   }
        // }

        // var raw_audience: any = {};
        // for (let aud in reformatted_f_aud) {
        //   if (
        //     !Object.keys(raw_audience).includes(reformatted_f_aud[aud].category)
        //   ) {
        //     raw_audience[reformatted_f_aud[aud].category] = {};
        //     raw_audience[reformatted_f_aud[aud].category][
        //       reformatted_f_aud[aud].key
        //     ] = {};
        //     raw_audience[reformatted_f_aud[aud].category][
        //       reformatted_f_aud[aud].key
        //     ][reformatted_f_aud[aud].value] = reformatted_f_aud[aud].cnt;
        //   } else {
        //     if (
        //       !Object.keys(
        //         raw_audience[reformatted_f_aud[aud].category]
        //       ).includes(reformatted_f_aud[aud].key)
        //     ) {
        //       raw_audience[reformatted_f_aud[aud].category][
        //         reformatted_f_aud[aud].key
        //       ] = {};
        //       raw_audience[reformatted_f_aud[aud].category][
        //         reformatted_f_aud[aud].key
        //       ][reformatted_f_aud[aud].value] = reformatted_f_aud[aud].cnt;
        //     } else {
        //       raw_audience[reformatted_f_aud[aud].category][
        //         reformatted_f_aud[aud].key
        //       ][reformatted_f_aud[aud].value] = reformatted_f_aud[aud].cnt;
        //     }
        //   }
        // }

        // var audiences: any = [];
        // var respo: any = [];
        // for (let cat in raw_audience) {
        //   for (let key in raw_audience[cat]) {
        //     for (let val in raw_audience[cat][key]) {
        //       respo.push({
        //         choice: val,
        //         count: raw_audience[cat][key][val],
        //       });
        //     }
        //     audiences.push({
        //       category: cat,
        //       question: key,
        //       responses: respo,
        //     });
        //     respo = [];
        //   }
        // }

        // console.log(audiences);

        var final_data: any = {};

        //var pyProg:any;
        const { spawnSync } = require("child_process");
        if (from && to) {
          formatted_from =
            from.split("-")[2] +
            "-" +
            from.split("-")[0] +
            "-" +
            from.split("-")[1];
          formatted_to =
            to.split("-")[2] + "-" + to.split("-")[0] + "-" + to.split("-")[1];

          // Get impressions using python script
          //const { spawnSync } = require('child_process');
          //const pyProg = spawn('python', ['/home/ubuntu/ooh_platform_python/script.py']);
          pyProg = spawnSync("python3", [
            "-W",
            "ignore",
            "/home/ubuntu/ooh_platform_python/predict.py",
            formatted_from,
            formatted_to,
          ]);
          console.log("HERE");
        } else {
          // Get impressions using python script
          //const { spawnSync } = require('child_process');
          //const pyProg = spawn('python', ['/home/ubuntu/ooh_platform_python/script.py']);
          var pyProg = spawnSync("python3", [
            "-W",
            "ignore",
            "/home/ubuntu/ooh_platform_python/predict.py",
          ]);
          console.log("HERE");
        }
        //console.log(pyProg.output.toString());
        //console.log(pyProg.output.toString().replace(/'/g, '"').slice(1,-1));
        var parsed_data = JSON.parse(
          pyProg.output.toString().replace(/'/g, '"').slice(1, -1)
        );

        //TODO Get Average of prediction for averages and MMDA data
        parsed_data["average_daily_impressions"] += resMMDA[0]["ave_daily"];
        parsed_data["average_daily_impressions"] /= 2;

        parsed_data["average_weekly_impressions"] += resMMDA[0]["ave_weekly"];
        parsed_data["average_weekly_impressions"] /= 2;

        parsed_data["average_monthly_impressions"] += resMMDA[0]["ave_monthly"];
        parsed_data["average_monthly_impressions"] /= 2;

        parsed_data["highest_monthly_impression"] += resMMDA[0]["ave_monthly"];
        parsed_data["highest_monthly_impression"] /= 2;

        final_data = {
          //...site_info,
          analytics: {
            ...parsed_data,
            //audiences,
          },
        };
        res.status(200).send(final_data);

        /*final_data = {
        ...resSql[0],
        audience
      }
      
      res.status(200).send(final_data);*/
        //res.status(200).send({"id": id});
        //res.status(200).send([]);
      }
    } else {
      // Retrieve all basic billboard sites information
      console.log("basic query");

      sql = `SELECT "site_id", "site_code", "site", "area", "city", "size", "segments", "region", "latitude", "longitude", "type", "price", "ideal_view", "imageURL" 
      FROM "sites";`; // `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;
      params = [];
      resSql = await DBPG.query(sql, params);

      res.status(200).send(resSql);
      //res.status(200).send({"response": "basic"});
    }
  },

  async getSiteBehaviors(req: Request, res: Response) {
    var from: any = req.query.from;
    var to: any = req.query.to;
    var id = req.query.id;
    var category: any = req.query.category || "Profile";

    var sql = "";
    var resSql: any;
    var resDate: any;
    var sqlDate: any;
    var area_code: any;
    var paramsDate: any;
    var formatted_to = "";
    var formatted_from = "";

    var params: any = [];

    console.log(`ID: '${id}' - '${category}'`);

    //fetch the area_code of the site based on its ID.
    sql = `SELECT "area" FROM "sites" WHERE "site_code" = $1;`;
    params = [id];

    resSql = await DBPG.query(sql, params);
    area_code = resSql[0]["area"];

    if (from && to) {
      //format the 'from' and 'to' dates to YYYY-MM-DD
      var from_f = from.split("-");
      var to_f = to.split("-");

      formatted_from = from_f[2] + "-" + from_f[0] + "-" + from_f[1];
      formatted_to = to_f[2] + "-" + to_f[0] + "-" + to_f[1];
      //SURVEYS sql query with from and to dates; count grouped by category, key, value
      sqlDate = `SELECT "response_id", "value" FROM "surveys" WHERE key = 'date_collected' AND "site_code" = $1
      AND TO_DATE("value", 'MM-DD-YY') >= $2 AND TO_DATE("value", 'MM-DD-YY') <= $3;`;

      paramsDate = [id, formatted_from, formatted_to]; //change to id
    } else {
      //SURVEYS sql query with from and to dates; count grouped by category, key, value
      sqlDate = `SELECT "response_id", "value" FROM "surveys" WHERE key = 'date_collected' AND "site_code" = $1
      AND TO_DATE("value", 'MM-DD-YY') >= CURRENT_DATE - INTERVAL '30 DAYS' AND TO_DATE("value", 'MM-DD-YY') <= CURRENT_DATE - INTERVAL '1 DAY';`;

      paramsDate = [id]; //change to id
    }
    resDate = await DBPG.query(sqlDate, paramsDate);

    // SURVEYS &OPTIONS query for cateogry, key, and value
    var sqlAud = `SELECT s."response_id", s."category", s."key", o."value"
     FROM "surveys" s
     JOIN "options" o ON o."vcode" = s."value" AND o."key" = s."key"
     WHERE "site_code" = $1;`;

    var paramsAud = [id]; //change to id
    var resAud: any = await DBPG.query(sqlAud, paramsAud);

    var rid_arr: any = resDate.map(
      (row: { response_id: any }) => row.response_id
    );
    var filtered_aud: any = {};

    resAud.forEach(
      (row: { response_id?: any; category?: any; key?: any; value?: any }) => {
        if (rid_arr.includes(row.response_id)) {
          // Check if response_id is included in the list of responses for specified date range
          const { category, key, value } = row;
          filtered_aud[category] = filtered_aud[category] || {};
          filtered_aud[category][key] = filtered_aud[category][key] || {};
          filtered_aud[category][key][value] =
            (filtered_aud[category][key][value] || 0) + 1;
        }
      }
    );

    // for (let category in filtered_aud) {
    //   for (let key in filtered_aud[category]) {
    //     for (let value in filtered_aud[category][key]) {
    //       reformatted_f_aud.push({
    //         category,
    //         key,
    //         value,
    //         cnt: filtered_aud[category][key][value],
    //       });
    //     }
    //   }
    // }

    // var raw_audience: any = {};

    // for (let aud in reformatted_f_aud) {
    //   const { category, key, value, cnt } = reformatted_f_aud[aud];
    //   raw_audience[category] = raw_audience[category] || {};
    //   raw_audience[category][key] = raw_audience[category][key] || {};
    //   raw_audience[category][key][value] = cnt;
    // }

    var audiences: any = [];
    var respo: any = [];
    for (let cat in filtered_aud) {
      for (let key in filtered_aud[cat]) {
        for (let val in filtered_aud[cat][key]) {
          respo.push({
            choice: val,
            count: filtered_aud[cat][key][val],
          });
        }
        audiences.push({
          category: cat,
          question: key,
          responses: respo,
        });
        respo = [];
      }
    }

    res.status(200).send(audiences);
  },

  async addSite(req: Request, res: Response) {
    var data = req.body;

    if (data) {
      var sql = `INSERT INTO sites("site_code", "site", "area", "region", "latitude", "longitude", "type", "site_owner", "board_facing", "imageURL", "city", "size", "segments", "price", "ideal_view")
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);`;
      var params = [
        data.site_code,
        data.site_name,
        data.area,
        data.region,
        data.lat,
        data.long,
        data.type,
        data.site_owner,
        data.board_facing,
        data.imageURL,
        data.city,
        data.size,
        data.segments,
        data.price,
        data.ideal_view,
      ];
      var resSql: any = await DBPG.query(sql, params);

      res.status(200).send({
        success: true,
      });
    } else {
      res.status(400).send({
        success: false,
        error_message: "Insertion failed. No data provided.",
      });
    }
  },

  async addMultipleSites(req: Request, res: Response) {
    var data = req.body;

    if (data) {
      var sql = `INSERT INTO sites("site_code","site","area","city","region","latitude","longitude","type","site_owner","board_facing","segments","price","ideal_view","size","imageURL") VALUES %L;`;
      var params = data;
      var resSql: any = await DBPG.multiInsert(sql, params);

      res.status(200).send({ success: true });
    } else {
      res.status(400).send({
        success: false,
        error_message: "Insertion failed. No data provided.",
      });
    }
  },

  async updateSite(req: Request, res: Response) {
    var data = req.body;
    console.log(data);
    if (data) {
      var sql = `UPDATE sites SET "site" = $1, "area" = $2, "region" = $3, "latitude" = $4, "longitude" = $5, "type" = $6, "site_owner" = $7, "board_facing" = $8, "imageURL" = $9, "city" = $10, "size" = $11, "segments" = $12, "price" = $13, "ideal_view" = $14 WHERE site_code = $15;`;
      var params = [
        data.site_name,
        data.area,
        data.region,
        data.lat,
        data.long,
        data.type,
        data.site_owner,
        data.board_facing,
        data.imageURL,
        data.city,
        data.size,
        data.segments,
        data.price,
        data.ideal_view,
        data.id,
      ];
      var resSql: any = await DBPG.query(sql, params);
      res.status(200).send({
        success: true,
      });
    } else {
      res.status(400).send({
        success: false,
        error_message: "Update failed, no data provided.",
      });
    }
  },
  async deleteSite(req: Request, res: Response) {
    var data = req.body;
    var id = data.id;
    console.log(data, id);
    if (id) {
      var sql = `DELETE FROM "sites" WHERE site_id = $1;`;
      var params = [id];
      var resSql: any = await DBPG.query(sql, params);
      res.status(200).send({ success: true });
    } else {
      res.status(400).send({
        success: false,
        error_message: "Deletion failed, no data provided.",
      });
    }
  },
  async planning(req: Request, res: Response) {
    var query = req.query.get;
    var options: any = req.query.options;

    var sql = "";
    var params: any = [];
    var resSql: any;
    var option_str = "";

    if (query === "demographics") {
      // Retrieve list of demographics for profile wishlist
      sql = `SELECT "category", "key", "value", "multi_resp"
      FROM "options"
      WHERE "category" != 'Profile';`; // `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;
      params = [];
      resSql = await DBPG.query(sql, params);

      var data: any = [];
      for (let row in resSql) {
        data.push({
          category: resSql[row].category,
          question: resSql[row].key,
          key: resSql[row].value,
          multi: resSql[row].multi_resp,
        });
      }
      res.status(200).send(data);
    } else if (query === "areas") {
      // Retrieve the list of areas based on the set options
      if (options) {
        console.log("WITH OPTIONS");
        // Retrieve data for all areas taking the filters into consideration
        var parsed_options = JSON.parse(options);

        //initial SQL query to fetch the site information
        option_str += `SELECT su."response_id", si."site", si."site_code", si."area", si."city", si."region", si."site_owner", su."category", su."key", su."value" AS code, op."value" AS value
        FROM "surveys" su
        JOIN "sites" si ON si."site_code" = su."site_code"
        LEFT JOIN "options" op ON op.vcode = su.value AND op."key" = su."key"
        WHERE su."key" = 'area'`;

        var opt_cnt = 0;
        var opt_arr: any = ["area"]; // WIll be used in checking if respondend fits all filter
        var formatted_datefrom = "";
        var formatted_dateto = "";

        var extra_counter = 0;
        for (let opt in parsed_options) {
          //sql query for date range filter
          if (opt === "dates") {
            //restructure date
            var from: any = parsed_options["dates"]["from"].split("-");
            var to: any = parsed_options["dates"]["to"].split("-");

            formatted_datefrom = from[2] + "-" + from[0] + "-" + from[1];
            formatted_dateto = to[2] + "-" + to[0] + "-" + to[1];

            //add the formatted dates to the sql query to filter the date range of results
            option_str +=
              ` OR ` +
              `su."key" = 'date_collected' AND TO_DATE(su."value", 'MM-DD-YY') >= '` +
              formatted_datefrom +
              `' AND TO_DATE(su."value", 'MM-DD-YY') <= '` +
              formatted_dateto +
              `'`;
            //push the date_collected key to options array
            opt_arr.push("date_collected");
          }

          //process other chosen options if there is
          if (Object.keys(parsed_options).length > 1 && opt !== "dates") {
            //generate SQl query for other options
            if (!Array.isArray(parsed_options[opt]["choices"])) {
              //sql query to process multiple chosen options
              option_str +=
                ` OR ` +
                `su."key" = '` +
                opt +
                `' AND su."value" IN (SELECT "vcode" FROM "options" WHERE "value" = '` +
                parsed_options[opt]["choices"] +
                `')`;
            } else {
              //sql query to process chosen single option
              for (let el in parsed_options[opt]["choices"]) {
                option_str +=
                  ` OR ` +
                  `su."key" = '` +
                  opt +
                  `' AND su."value" IN (SELECT "vcode" FROM "options" WHERE "value" = '` +
                  parsed_options[opt]["choices"][el] +
                  `')`;
              }
            }

            //push the option to the aray
            opt_arr.push(opt);

            //add extra counter if allowMultiple is true
            if (parsed_options[opt]["allowMultiple"]) {
              extra_counter += parsed_options[opt]["choices"].length - 1;
            }
          }
        }

        params = [];
        resSql = await DBPG.query(option_str, params);

        // Segregate data by site, then by response_id (<household id>_<individual id>)
        var processed_data: any = {};

        for (let row in resSql) {
          //process each row of the result
          var resRow = resSql[row];

          //assign response_id to be used for later
          var response_id = resRow.response_id;

          //initialize an empty object if the response id is not present in the processed_data object.
          if (!Object.keys(processed_data).includes(response_id)) {
            processed_data[response_id] = {};
          }

          //populate the object with the specific results
          processed_data[response_id]["site"] = resRow.site;
          processed_data[response_id]["city"] = resRow.city;
          processed_data[response_id]["region"] = resRow.region;
          processed_data[response_id]["site_owner"] = resRow.site_owner;
          processed_data[response_id]["site_code"] = resRow.site_code;

          if (resRow.key === "area") {
            //assign the value of the area instead of its name if the current key is 'area'
            processed_data[response_id][resRow.key] = resRow.value;
          } else {
            // If processed_data[rid] does not include resSql[row].key, insert with value 1, else, increment by 1
            if (
              !Object.keys(processed_data[response_id]).includes(resRow.key)
            ) {
              processed_data[response_id][resRow.key] = 1;
            } else {
              processed_data[response_id][resRow.key] += 1;
            }
          }
        }

        //initialize variables to be used for grouping the sites by cities and areas
        var count_data: any = {};
        var data: any = [];
        var opt_match = 0;
        var id = 0;
        var cur_area = "";
        var cur_city = "";
        var cur_site = "";
        var cur_region = "";
        var cur_site_owner = "";
        var cur_site_code = "";

        for (let rid in processed_data) {
          for (let opt in opt_arr) {
            //initialize variable for easier use later in the code
            var rid_data = processed_data[rid];
            var option = opt_arr[opt];
            if (rid_data[option]) {
              if (option === "area") {
                //set current area if option is area
                cur_area = rid_data[option];
              }
              //set the other variables
              cur_site = rid_data["site"];
              cur_city = rid_data["city"];
              cur_region = rid_data["region"];
              cur_site_owner = rid_data["site_owner"];
              cur_site_code = rid_data["site_code"];

              //if the value of an option is number, run the code below, or else increment it by 1 automatically
              if (typeof rid_data[option] === "number") {
                if (option === "date_collected") {
                  opt_match += 1;
                } else if (parsed_options[option]["allowMultiple"]) {
                  //increment again if allowMultiple is set to true
                  opt_match += rid_data[option]; // 1; //instead of 1, increment by the value of processed_data[rid][opt_arr[opt]] if processed_data[rid][opt_arr[opt]] is a number
                } else {
                  opt_match += 1;
                }
              } else {
                opt_match += 1;
              }
            }
          }
          if (opt_match == opt_arr.length + extra_counter) {
            //add the "extra counter" to length of opt_arr
            if (!Object.keys(count_data).includes(cur_area)) {
              count_data[cur_area] = {
                id,
                site: cur_site,
                site_code: cur_site_code,
                city: cur_city,
                area: cur_area,
                region: cur_region,
                site_owner: cur_site_owner,
                fits_no: 1,
              };
              cur_site = "";
              cur_city = "";
              cur_region = "";
              id += 1;
            } else {
              count_data[cur_area]["fits_no"] += 1;
            }
            cur_area = "";
          }
          opt_match = 0;
        }

        // Retrieve date per response_id (for getting average monthly impressions)
        var sqlDates = `SELECT "response_id", TO_DATE("value", 'MM-DD-YY') AS date
        FROM "surveys"
        WHERE "key" = 'date_collected'
        AND TO_DATE("value", 'MM-DD-YY') >= $1 AND TO_DATE("value", 'MM-DD-YY') <= $2;`;
        var paramsDates: any = [formatted_datefrom, formatted_dateto];
        var resDates: any = await DBPG.query(sqlDates, paramsDates);

        // Retrieve area per response_id (for getting average monthly impressions)
        var sqlAreas = `SELECT "response_id", op."value"
        FROM "surveys" su
        JOIN "options" op ON op.vcode = su.value AND op."key" = su."key"
        WHERE su."key" = 'area';`;
        var paramsAreas: any = [];
        var resAreas: any = await DBPG.query(sqlAreas, paramsAreas);

        var areaObj: any = {};
        for (let area in resAreas) {
          areaObj[resAreas[area].response_id] = resAreas[area].value;
        }

        // Collect response_id of response per area with date entry
        var area_per_month: any = {};
        for (let entry in resDates) {
          if (Object.keys(areaObj).includes(resDates[entry].response_id)) {
            if (
              !Object.keys(area_per_month).includes(
                areaObj[resDates[entry].response_id]
              )
            ) {
              area_per_month[areaObj[resDates[entry].response_id]] = {};
              area_per_month[areaObj[resDates[entry].response_id]][
                moment(resDates[entry].date).format("YYYY-MM-DD").slice(0, 7)
              ] = 1;
            } else {
              if (
                !Object.keys(
                  area_per_month[areaObj[resDates[entry].response_id]]
                ).includes(
                  moment(resDates[entry].date).format("YYYY-MM-DD").slice(0, 7)
                )
              ) {
                area_per_month[areaObj[resDates[entry].response_id]][
                  moment(resDates[entry].date).format("YYYY-MM-DD").slice(0, 7)
                ] = 1;
              } else {
                area_per_month[areaObj[resDates[entry].response_id]][
                  moment(resDates[entry].date).format("YYYY-MM-DD").slice(0, 7)
                ] += 1;
              }
            }
          }
        }

        var areaTally: any = {};
        for (let area in area_per_month) {
          if (!Object.keys(areaTally).includes(area)) {
            areaTally[area] = {
              total: 0,
              count: 0,
            };
            for (let date in area_per_month[area]) {
              areaTally[area]["total"] += area_per_month[area][date];
              areaTally[area]["count"] += 1;
            }
          } else {
            for (let date in area_per_month[area]) {
              areaTally[area]["total"] += area_per_month[area][date];
              areaTally[area]["count"] += 1;
            }
          }
        }

        for (let area in areaTally) {
          areaTally[area]["mean"] =
            areaTally[area]["total"] / areaTally[area]["count"];
        }

        for (let entry in count_data) {
          if (Object.keys(areaTally).includes(entry)) {
            count_data[entry]["fits_rate"] = parseFloat(
              (
                (count_data[entry]["fits_no"] * 100) /
                areaTally[entry]["total"]
              ).toFixed(2)
            );
            count_data[entry]["avg_monthly_impressions"] =
              areaTally[entry]["mean"];
          } else {
            delete count_data[entry];
          }
        }

        var grouped_sites: any = {};
        for (let area in count_data) {
          cur_city = count_data[area]["city"];
          if (!grouped_sites[cur_city]) {
            grouped_sites[cur_city] = [];
          }

          grouped_sites[cur_city].push(count_data[area]);
          cur_city = "";
        }
        res.status(200).send(grouped_sites);
      } else {
        option_str += `SELECT su."response_id", si."site", si."area",si."city", si."region", si."site_owner" , su."category", su."key", su."value" AS code, op."value" AS value
        FROM "surveys" su
        JOIN "sites" si ON si."site_code" = su."site_code"
        LEFT JOIN "options" op ON op.vcode = su.value AND op."key" = su."key"
        WHERE su."key" = 'area';`;
        var opt_cnt = 0;
        var opt_arr: any = ["area"]; // WIll be used in checking if respondend fits all filter
        var formatted_datefrom = "";
        var formatted_dateto = "";

        console.log(option_str);
        params = [];
        resSql = await DBPG.query(option_str, params);

        console.log(resSql);
        // Segregate data by site, then by response_id (<household id>_<individual id>)
        var processed_data: any = {};

        for (let row in resSql) {
          var resRow = resSql[row];
          var response_id = resRow.response_id;
          if (!Object.keys(processed_data).includes(response_id)) {
            processed_data[response_id] = {};
          }
          processed_data[response_id]["site"] = resRow.site;
          processed_data[response_id]["city"] = resRow.city;
          processed_data[response_id]["region"] = resRow.region;
          processed_data[response_id]["site_owner"] = resRow.site_owner;
          processed_data[response_id]["site_code"] = resRow.site_code;

          if (resRow.key === "area") {
            processed_data[response_id][resRow.key] = resRow.value;
          } else {
            // If processed_data[rid] does not include resSql[row].key, insert with value 1, else, increment by 1
            if (
              !Object.keys(processed_data[response_id]).includes(resRow.key)
            ) {
              processed_data[response_id][resRow.key] = 1;
            } else {
              processed_data[response_id][resRow.key] += 1;
            }
          }
        }

        var count_data: any = {};
        var data: any = [];
        var opt_match = 0;
        var id = 0;
        var cur_area = "";
        var cur_city = "";
        var cur_site = "";
        var cur_region = "";
        var cur_site_owner = "";
        var cur_site_code = "";

        for (let rid in processed_data) {
          for (let opt in opt_arr) {
            if (processed_data[rid][opt_arr[opt]]) {
              if (opt_arr[opt] === "area") {
                cur_area = processed_data[rid][opt_arr[opt]];
              }
              cur_site = processed_data[rid]["site"];
              cur_city = processed_data[rid]["city"];
              cur_region = processed_data[rid]["region"];
              cur_site_owner = processed_data[rid]["site_owner"];
              cur_site_code = processed_data[rid]["site_code"];
              opt_match += 1;
            }
          }
          if (opt_match == opt_arr.length) {
            if (!Object.keys(count_data).includes(cur_area)) {
              count_data[cur_area] = {
                id,
                site: cur_site,
                area: cur_area,
                city: cur_city,
                region: cur_region,
                site_owner: cur_site_owner,
                fits_no: 1,
              };
              id += 1;
              cur_site = "";
              cur_city = "";
              cur_region = "";
            } else {
              count_data[cur_area]["fits_no"] += 1;
            }
            cur_area = "";
          }
          opt_match = 0;
        }

        // Retrieve date per response_id (for getting average monthly impressions)
        var sqlDates = `SELECT "response_id", TO_DATE("value", 'MM-DD-YY') AS date
        FROM "surveys"
        WHERE "key" = 'date_collected';`;
        var paramsDates: any = [];
        var resDates: any = await DBPG.query(sqlDates, paramsDates);

        // Retrieve area per response_id (for getting average monthly impressions)
        var sqlAreas = `SELECT "response_id", op."value"
        FROM "surveys" su
        JOIN "options" op ON op.vcode = su.value AND op."key" = su."key"
        WHERE su."key" = 'area';`;
        var paramsAreas: any = [];
        var resAreas: any = await DBPG.query(sqlAreas, paramsAreas);

        var areaObj: any = {};
        for (let area in resAreas) {
          areaObj[resAreas[area].response_id] = resAreas[area].value;
        }

        // Collect response_id of response per area with date entry
        var area_per_month: any = {};
        for (let entry in resDates) {
          console.log(moment(resDates[entry].date).format("YYYY-MM-DD"));
          if (Object.keys(areaObj).includes(resDates[entry].response_id)) {
            if (
              !Object.keys(area_per_month).includes(
                areaObj[resDates[entry].response_id]
              )
            ) {
              area_per_month[areaObj[resDates[entry].response_id]] = {};
              area_per_month[areaObj[resDates[entry].response_id]][
                moment(resDates[entry].date).format("YYYY-MM-DD").slice(0, 7)
              ] = 1;
            } else {
              if (
                !Object.keys(
                  area_per_month[areaObj[resDates[entry].response_id]]
                ).includes(
                  moment(resDates[entry].date).format("YYYY-MM-DD").slice(0, 7)
                )
              ) {
                area_per_month[areaObj[resDates[entry].response_id]][
                  moment(resDates[entry].date).format("YYYY-MM-DD").slice(0, 7)
                ] = 1;
              } else {
                area_per_month[areaObj[resDates[entry].response_id]][
                  moment(resDates[entry].date).format("YYYY-MM-DD").slice(0, 7)
                ] += 1;
              }
            }
          }
        }

        var areaTally: any = {};
        for (let area in area_per_month) {
          if (!Object.keys(areaTally).includes(area)) {
            areaTally[area] = {
              total: 0,
              count: 0,
            };
            for (let date in area_per_month[area]) {
              areaTally[area]["total"] += area_per_month[area][date];
              areaTally[area]["count"] += 1;
            }
          } else {
            for (let date in area_per_month[area]) {
              areaTally[area]["total"] += area_per_month[area][date];
              areaTally[area]["count"] += 1;
            }
          }
        }

        for (let area in areaTally) {
          areaTally[area]["mean"] =
            areaTally[area]["total"] / areaTally[area]["count"];
        }

        for (let entry in count_data) {
          count_data[entry]["fits_rate"] = parseFloat(
            (
              (count_data[entry]["fits_no"] * 100) /
              areaTally[entry]["total"]
            ).toFixed(2)
          );
          count_data[entry]["avg_monthly_impressions"] =
            areaTally[entry]["mean"];
        }

        var grouped_sites: any = {};
        for (let area in count_data) {
          cur_city = count_data[area]["city"];
          if (!grouped_sites[cur_city]) {
            grouped_sites[cur_city] = [];
          }

          grouped_sites[cur_city].push(count_data[area]);
          cur_city = "";
        }
        res.status(200).send(grouped_sites);
      }
    }
  },
};
