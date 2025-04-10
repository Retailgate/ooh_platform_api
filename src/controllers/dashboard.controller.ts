import e, { Request, Response } from "express";
import * as SqlString from "sqlstring";
import * as uuid from "uuid";
import { DBPG } from "../db/db-pg";
//import { count } from 'console';
import moment from "moment";
import { MYSQL } from "../db/mysql-pg";
import fetch from "node-fetch";
import { rawListeners } from "process";
//import { parse } from 'path';
//file from local updated

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
    var area_code: any = "";
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
      WHERE "type" = $1 AND "created_at" > '2024-03-01';`; // `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;
      params = [type];
      resSql = await DBPG.query(sql, params);
      area_code = resSql[0]["area"];

      res.status(200).send(resSql);
    } else if (count === "true") {
      // Retrieves the number of billboard sites per region
      console.log("count: ", count);

      sql = `SELECT "region", "type", COUNT("site_id") AS cnt 
      FROM "sites" WHERE "created_at" > '2024-03-01'
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
        WHERE "site_code" = $1 AND "created_at" > '2024-03-01';`;
        params = [id];

        resSql = await DBPG.query(sql, params);

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
        // var cur_year = cur_date.getFullYear();
        // console.log(cur_year);
        sql = `SELECT "site_id", "site_code", "site", "area", "city", "size", "segments", "region", 
        "site_owner", "type", "latitude", "longitude", 
        "board_facing", "facing", "access_type", "price", "ideal_view", "imageURL" 
        FROM "sites"
        WHERE "site_code" = $1 AND "created_at" > '2024-03-01';`;
        params = [id];

        resSql = await DBPG.query(sql, params);
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

        area_code = site_info["area"];
        var formatted_from = "";
        var formatted_to = "";

        if (from && to) {
          var from_f = from.split("-");
          var to_f = to.split("-");

          formatted_from = from_f[2] + "-" + from_f[0] + "-" + from_f[1];
          formatted_to = to_f[2] + "-" + to_f[0] + "-" + to_f[1];

        }

        var final_data: any = {};
        var impressions: any;
        if (from && to) {
          var sqlDate = `SELECT "impressions", "record_at" FROM impressions
          WHERE area = $1
          AND "record_at" BETWEEN $2 AND $3 ORDER BY "record_at" ASC;`;
          var paramsDate = [area_code, formatted_from, formatted_to]; //change to id

          impressions = await DBPG.query(sqlDate, paramsDate);
        }

        const dailyGroups: any = {};
        const weeklyGroups: any = {};
        const monthlyGroups: any = {};

        for (var imp of impressions) {
          var date = new Date(
            new Date(imp.record_at).setDate(
              new Date(imp.record_at).getDate() + 1
            )
          );
          var dayKey = formatDate(date);
          var weekKey = getStartOfWeek(new Date(date));
          var monthKey = getStartOfMonth(new Date(date));

          if (!dailyGroups[dayKey]) dailyGroups[dayKey] = [];
          dailyGroups[dayKey].push(imp);

          if (!weeklyGroups[weekKey]) weeklyGroups[weekKey] = [];
          weeklyGroups[weekKey].push(imp);

          if (!monthlyGroups[monthKey]) monthlyGroups[monthKey] = [];
          monthlyGroups[monthKey].push(imp);
        }

        const dailyAverages = calculateAverage(dailyGroups);
        const weeklyAverages = calculateTotal(weeklyGroups);
        const monthlyAverages = calculateTotal(monthlyGroups);

        final_data = {
          // ...site_info,
          analytics: {
            average_daily_impressions:
              dailyAverages.reduce(
                (sum, item) => (sum = sum + item.impressions),
                0
              ) / dailyAverages.length,
            average_weekly_impressions:
              weeklyAverages.reduce(
                (sum, item) => (sum = sum + item.impressions),
                0
              ) / weeklyAverages.length,
            average_monthly_impressions:
              monthlyAverages.reduce(
                (sum, item) => (sum = sum + item.impressions),
                0
              ) / monthlyAverages.length,
            impressions: {
              daily: dailyAverages,
              weekly: weeklyAverages,
              monthly: monthlyAverages,
            },
            //audiences,
          },
        };
        res.status(200).send(final_data);
      }
    } else {
      // Retrieve all basic billboard sites information
      console.log("basic query");

      sql = `SELECT "site_id", s."site_code", "site", "area", COALESCE(sa."city",s."city") as city, "size", "segments", "region", sa."address", "latitude", "longitude", "site_owner", "type", "price", "ideal_view", "imageURL" 
      FROM "sites" s LEFT JOIN "site_additional" sa ON sa."site_code" = s."site_code"  WHERE "created_at" > '2024-03-01';`; // `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;
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
    var impressions: any;
    var paramsDate: any;
    var formatted_to = "";
    var formatted_from = "";

    var params: any = [];

    console.log(`ID: '${id}' - '${category}'`);

    //fetch the area_code of the site based on its ID.
    sql = `SELECT MIN(a.mmda_road) as mmda_road, MIN(s.area) as area, AVG(i.impressions) as impressions FROM sites s JOIN area_roads ar ON s.area = ar.area JOIN areas a ON ar.road_id = a.id JOIN impressions i ON i.area = s.area WHERE s.site_code = $1`;
    params = [id];

    resSql = await DBPG.query(sql, params);
    area_code = resSql[0]["mmda_road"];
    impressions = resSql[0]["impressions"] ?? 0;

    //format the 'from' and 'to' dates to YYYY-MM-DD
    var from_f = from.split("-");
    var to_f = to.split("-");

    formatted_from = from_f[2] + "-" + from_f[0] + "-" + from_f[1];
    formatted_to = to_f[2] + "-" + to_f[0] + "-" + to_f[1];
    //SURVEYS sql query with from and to dates; count grouped by category, key, value
    sqlDate = `SELECT "response_id", "value" FROM "surveys" WHERE key = 'date_collected' AND "area" = $1
    AND TO_DATE("value", 'MM-DD-YY') BETWEEN $2 AND $3;`;

    
    paramsDate = [area_code, formatted_from, formatted_to]; //change to id
    resDate = await DBPG.query(sqlDate, paramsDate);

    const responseCount = resDate.length;

    // SURVEYS &OPTIONS query for cateogry, key, and value
    var sqlAud = `SELECT s."response_id", s."category", s."key", o."value"
     FROM "surveys" s
     JOIN "options" o ON o."vcode" = s."value" AND o."key" = s."key"
     WHERE "area" = $1;`;

    var paramsAud = [area_code]; //change to id
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

    var audiences: any = [];
    var respo: any = [];
    for (let cat in filtered_aud) {
      for (let key in filtered_aud[cat]) {
        for (let val in filtered_aud[cat][key]) {


          let count = 0;
          const responsesCount = filtered_aud[cat][key][val];
          if(impressions === 0){
            count = responsesCount;
          }else{
            count = Math.ceil(responsesCount / responseCount * impressions);
          }

          respo.push({
            choice: val,
            count: count,
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
      var params = data[0];

      var resSql: any = await DBPG.multiInsert(sql, params);

      if (resSql && data[1].length > 0) {
        sql = `INSERT INTO site_additional ("structure_code","site_code","city","address") VALUES %L;`;
        params = data[1];
        resSql = await DBPG.multiInsert(sql, params);
      }

      res.status(200).send({ success: true });
    } else {
      res.status(400).send({
        success: false,
        error_message: "Insertion failed. No data provided.",
      });
    }
  },

  async updateSiteAvailability(req: Request, res: Response) {
    var data = req.body;

    if (data) {
      const sql = `
      INSERT INTO site_contracts (
        "site_id",
        "brand",
        "contract_end_date",
        "adjusted_end_date",
        "adjustment_reason",
        "remarks",
        "contract_no"
      ) VALUES %L
      ON CONFLICT ("site_id") 
      DO UPDATE SET
        "brand" = EXCLUDED."brand",
        "contract_end_date" = EXCLUDED."contract_end_date",
        "adjusted_end_date" = EXCLUDED."adjusted_end_date",
        "adjustment_reason" = EXCLUDED."adjustment_reason",
        "remarks" = EXCLUDED."remarks",
        "contract_no" = EXCLUDED."contract_no",
		    "date_modified" = NOW();
    `;

      var resSql: any = await DBPG.multiInsert(sql, data);

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
    const { options } = req.query;

    var sql = "";
    var params: any = [];
    var resSql: any;

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
      if (!options) {
        res.send("Options not found").status(400);
        return;
      }
      if (typeof options !== "string") {
        res.status(400).send("Invalid options format");
        return;
      }
      const parsedOptions = JSON.parse(options);
      const dates = parsedOptions.dates;
      //sample option: {"dates":{"from":"11-01-2024","to":"04-03-2025"}}
      console.log(parsedOptions);
      const date_from = dates?.from;
      const date_to = dates?.to;

      if (!date_from || !date_to) {
        res.status(400).send({ error: "Invalid date range." });
        return;
      }
      delete parsedOptions.dates;
      const keys: string[] = Object.keys(parsedOptions);
      console.log(keys);

      let initSQL: string = `SELECT su.response_id, su.area, su.key, su.value FROM surveys su LEFT JOIN options op ON su.key = op.key AND su.value = op.vcode WHERE (su.key = 'date_collected' AND su.value BETWEEN $1 AND $2)`;

      if (keys.length > 0) {
        const additionalOptions = keys.map((key) => {
          const choices = parsedOptions[key].choices
            .map((ch: string) => `'${ch}'`)
            .join(",");

          return `(su.key = '${key}' AND su.value IN (SELECT vcode FROM options WHERE value IN (${choices})))`;
        });

        initSQL += ` OR ${additionalOptions.join(" OR ")}`;
      }

      console.log(initSQL);
      const rawRes: any = await DBPG.query(initSQL, [date_from, date_to]);

      keys.push("date_collected");
      // Step 1: Group responses by area and response_id
      const groupedByAreaAndResponseId = rawRes.reduce(
        (acc: any, item: any) => {
          if (!acc[item.area]) acc[item.area] = {};
          if (!acc[item.area][item.response_id])
            acc[item.area][item.response_id] = {};
          acc[item.area][item.response_id][item.key] = item.value;
          return acc;
        },
        {}
      );

      const result: any = {};

      for (const area in groupedByAreaAndResponseId) {
        let count = 0;

        for (const response_id in groupedByAreaAndResponseId[area]) {
          const response = groupedByAreaAndResponseId[area][response_id];

          const isValid = keys.every((key) => response.hasOwnProperty(key));

          if (isValid) {
            count++;
          }

          result[area] = count;
        }
      }

      const resSql = `SELECT area, COUNT(DISTINCT s.response_id) AS total_responses FROM surveys s WHERE s.key = 'date_collected' AND s.value BETWEEN $1 AND $2 GROUP BY area ORDER BY total_responses DESC`;
      const allRes: any = await DBPG.query(resSql, [date_from, date_to]);

      const siteQuery = `SELECT s.site_code, s.city, s.region, s.site_owner,s.area AS site_area, ar.area, a.mmda_road, a.mmda_code FROM area_roads ar JOIN areas a ON a.id = ar.road_id JOIN sites s ON s.area = ar.area`;
      // console.log(siteQuery);
      const resSite: any = await DBPG.query(siteQuery, []);

      const responseData: any = {};
      for (const road in result) {
        if (!responseData[road]) {
          const currentRoad = allRes.find((res: any) => res.area === road);
          const sitesInRoad = resSite.filter(
            (site: any) => site.mmda_road === road
          );
          const rate = (result[road] / currentRoad.total_responses) * 100;

          if (sitesInRoad.length > 0) {
            responseData[road] = sitesInRoad.map((site: any) => {
              return {
                site_code: site.site_code,
                area: site.site_area,
                region: site.region,
                mmda: road,
                site_owner: site.site_owner,
                fits_no: 0,
                fits_rate: rate,
                avg_monthly_impressions: 0,
              };
            });
          } else {
            responseData[road] = [];
          }
        }
      }
      res.send(responseData).status(200);
    }
  },

  async fetchImpressions(req: Request, res: Response) {
    //{{local_url}}dashboard/impressions?sites=[SL01_SL02,SL02_SL01]
    const query: any = req.query.dates;
    const dates = JSON.parse(query);
    try {
      const query = `SELECT area, AVG(impressions) FROM impressions WHERE record_at BETWEEN $1 AND $2 GROUP BY area`;
      const queryRes: any = await DBPG.query(query, [dates.from, dates.to]);
      res.status(200).send(queryRes);
    } catch (e) {
      console.log(e);
      res.send(e).status(400);
      5;
    }
  },

  async getLandmarks(req: Request, res: Response) {
    const sql = `SELECT * FROM landmarks`;
    const resSql: any = await DBPG.query(sql, []);
    res.status(200).send(resSql);
  },

  async getSiteImages(req: Request, res: Response) {
    const params = req.params;
    const site = params.id.split("-");
    const results: any = await MYSQL.query(
      "SELECT s.structure_id, s.structure_code, ss.facing_no, ss.transformation, ss.segment, ss.image FROM hd_structure s JOIN hd_structure_segment ss ON ss.structure_id = s.structure_id WHERE s.structure_code LIKE ?",
      [`${site[0] === "3D" ? params.id : site[0]}%`]
    );
    let urlQuery = "SELECT * FROM hd_file_upload WHERE upload_id IN ";

    if (Array.isArray(results)) {
      if (results.length > 0) {
        const segment =
          site[0] === "3D"
            ? results[0]
            : results.find((result) => {
                const suffix = site[1];
                const storedSuffix = `${result.facing_no}${
                  result.transformation
                }${String(result.segment).padStart(2, "0")}`;

                return suffix === storedSuffix;
              });

        if (!segment) {
          res.status(200).send({ status: "No results found." });
          return;
        }
        if (segment.image === "") {
          res.status(200).send({ status: "No results found." });
          return;
        }

        const imageIDs = String(segment.image).split(",");
        if (imageIDs.length > 0) {
          const IDs = `(${imageIDs.join(",")})`;

          urlQuery += IDs;
          urlQuery += " ORDER BY date_uploaded";
          const imageLinks = await MYSQL.query(urlQuery);
          res.status(200).send(imageLinks);
        } else {
          res.status(200).send({ status: "No results found." });
        }
      } else {
        res.status(200).send({ status: "No results found." });
      }
    }
    // const result = results[0];
    // if (result.image) {
    // } else {
    //   res.status(400).send("No results found");
    // }
  },

  async getAreas(req: Request, res: Response) {
    const results: any = await MYSQL.query(
      "SELECT city_id, city_code, city_name FROM `oams-un`.hd_ad_city ORDER BY city_name ASC;"
    );
    res.status(200).send(results);
  },

  async getUNISSiteDetails(req: Request, res: Response) {
    const results: any = await MYSQL.query(
      "SELECT s.structure_code, CONCAT(s.structure_code,'-',ss.facing_no,ss.transformation, LPAD(ss.segment,2,'0')) as site_code, s.traffic_count, ss.traffic as bound, c.city_name, ss.facing, s.vicinity_population FROM hd_structure s JOIN hd_ad_city c ON s.city_id = c.city_id JOIN hd_structure_segment ss ON s.structure_id = ss.structure_id;"
    );
    res.status(200).send(results);
  },

  async getSiteBookings(req: Request, res: Response) {
    const id = req.query.id;
    let sql = "SELECT * FROM site_booking";
    if (id) {
      sql += " WHERE site_id = $1";
    }

    const results: any = await DBPG.query(sql, id ? [id] : []);
    res.status(200).send(results);
  },
  async insertSiteBooking(req: Request, res: Response) {
    const data = req.body;

    console.log(data);

    if (data) {
      const sql = `INSERT INTO site_booking (srp,"booking_status","client","account_executive","date_from","date_to","monthly_rate","remarks","site_rental","old_client","site_id" ) VALUES %L 
      ON CONFLICT ("site_id")
      DO UPDATE SET 
      srp = EXCLUDED.srp,
      "booking_status" = EXCLUDED."booking_status",
      "client" = EXCLUDED."client",
      "account_executive" = EXCLUDED."account_executive",
      "date_from" = EXCLUDED."date_from",
      "date_to" = EXCLUDED."date_to",
      "monthly_rate" = EXCLUDED."monthly_rate",
      "remarks" = EXCLUDED."remarks",
      "site_rental" = EXCLUDED."site_rental",
      "old_client" = EXCLUDED."old_client",
      "date_modified" = NOW();`;

      var resSql: any = await DBPG.multiInsert(sql, [data]);

      res.status(200).send({ success: true });
    }
  },
  async getSiteContractDates(req: Request, res: Response) {
    const unis_results: any = await MYSQL.query(
      `SELECT *,CASE
        WHEN DATE(end_date) < DATE(NOW()) THEN ABS(DATEDIFF(DATE(NOW()), DATE(end_date)))
        ELSE NULL
    END AS days_vacant,
    CASE
        WHEN DATEDIFF(DATE(end_date), DATE(NOW())) >= 0 THEN DATEDIFF(DATE(end_date), DATE(NOW()))
        ELSE NULL
    END AS remaining_days
        FROM (SELECT A.*, B.lease_contract_code, B.net_contract_amount, B.payment_term_id, B.date_from as lease_date_from, B.date_to as lease_date_to
        FROM (SELECT A.*, MAX(B.lease_contract_id) as lease_contract_id
        FROM (SELECT A.*, B.structure_id, B.segment_id, C.division_id,E.contract_id, C.structure_code as structure, 
        CONCAT(C.structure_code, "-", D.facing_no, D.transformation, LPAD(D.segment,2,'0')) AS site, 
        F.category, E.contract_no, B.product, C.address, B.date_from, B.date_to as end_date, C.date_created
        FROM(
        SELECT MAX(A.contract_structure_id) as contract_structure_id
        FROM hd_contract_structure A
        JOIN hd_contract B ON A.contract_id = B.contract_id
        JOIN hd_structure C ON A.structure_id = C.structure_id 
        JOIN hd_structure_segment D ON A.segment_id = D.segment_id
        WHERE A.void = 0 
        AND A.material_availability IS NOT NULL
        AND C.status_id = 1
        AND C.deleted = 0
        AND D.status_id = 1
        AND D.deleted = 0
        AND D.transformed = 0
        AND C.product_division_id IN (1,49)
        AND B.contract_status_id NOT IN (1,5,6)
        AND A.addendum_type NOT IN (5)
        AND B.special_instruction NOT LIKE "%preterm%"
        AND B.renewal_contract_id = 0
        GROUP BY A.segment_id
        ORDER BY A.structure_id ASC, A.segment_id ASC) A
        JOIN hd_contract_structure B ON A.contract_structure_id = B.contract_structure_id
        JOIN hd_structure C ON B.structure_id = C.structure_id
        JOIN hd_structure_segment D ON B.segment_id = D.segment_id
        JOIN hd_contract E ON B.contract_id = E.contract_id
        JOIN hd_structure_category F ON C.category_id = F.category_id) A
        LEFT JOIN (SELECT A.lease_contract_id, A.lease_contract_code, B.structure_id, A.net_contract_amount, A.date_from, A.date_to as end_date
        FROM hd_lease_contract A
        JOIN hd_structure B ON A.structure_id = B.structure_id
        WHERE B.product_division_id IN (1,49) AND B.status_id = 1 AND B.deleted = 0) B ON A.structure_id = B.structure_id  
          GROUP BY segment_id) A
        LEFT JOIN hd_lease_contract B ON A.lease_contract_id = B.lease_contract_id
        UNION ALL 
        SELECT NULL as contract_structure_id, B.structure_id, C.segment_id, B.division_id, NULL as contract_id, B.structure_code as structure, 
        CONCAT(B.structure_code,"-",C.facing_no, C.transformation, LPAD(C.segment,2,"0")) as site,
        D.category, NULL as contract_no, NULL as product, B.address, NULL as date_to, NULL as date_from, B.date_created,
        E.lease_contract_id, E.lease_contract_code, E.net_contract_amount, E.payment_term_id, E.date_from as lease_date_from, E.date_to as lease_date_to
        FROM (
          SELECT A.structure_id, MAX(B.lease_contract_id) as lease_contract_id
            FROM hd_structure A 
            LEFT JOIN hd_lease_contract B ON A.structure_id = B.structure_id 
            GROUP BY structure_id) A
        JOIN hd_structure B ON A.structure_id = B.structure_id
        JOIN hd_structure_segment C ON A.structure_id = C.structure_id
        JOIN hd_structure_category D ON B.category_id = D.category_id
        LEFT JOIN hd_lease_contract E ON A.lease_contract_id = E.lease_contract_id
        LEFT JOIN hd_contract_structure F ON B.structure_id = F.structure_id AND C.segment_id = F.segment_id
        WHERE F.contract_structure_id IS NULL
        AND B.status_id = 1 AND C.status_id = 1 AND B.deleted = 0 AND C.deleted = 0 AND B.product_division_id IN (1,49) AND C.transformed = 0
        GROUP BY C.segment_id
        ) sites
        ORDER BY division_id ASC, structure ASC, site ASC`
    );

    const ooh_results: any = await DBPG.query(
      `SELECT "site_id", "brand", "contract_end_date", "adjusted_end_date", "adjustment_reason","remarks","date_modified", "contract_no" FROM site_contracts;`,
      []
    );

    const final_list = unis_results.map((result: { [x: string]: any }) => {
      // CHECK IF FETCHED SITE FROM UNIS EXISTS IN WEBSITE DATABASE
      const existing_site = ooh_results.find(
        (site: { site_id: any }) => result.site === site.site_id
      );
      return {
        ...result,
        product: existing_site ? existing_site.brand : result.product,
        adjusted_end_date: existing_site
          ? existing_site.adjusted_end_date
          : null,
        adjustment_reason: existing_site
          ? existing_site.adjustment_reason
          : null,
        remarks: existing_site ? existing_site.remarks : "",
        contract_changed: existing_site
          ? result.contract_no !== existing_site.contract_no
          : false,
      };
    });

    res.status(200).send(final_list);
  },

  async notifyBooking(req: Request, res: Response) {
    const { payload, bookingData } = req.body;

    try {
      // Fetch tenant access token
      const { tenant_access_token } = await fetchFromLark(
        "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!tenant_access_token) {
        return res
          .status(400)
          .send({ message: "Failed to get tenant access token" });
      }

      // Fetch chat list
      const gcResponse = await fetchFromLark(
        "https://open.larksuite.com/open-apis/im/v1/chats",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tenant_access_token}`,
          },
        }
      );

      if (!gcResponse?.data?.items?.length) {
        return res.status(400).send({ message: "No available chats" });
      }

      const chatID = gcResponse.data.items[0].chat_id;

      if (!bookingData) {
        return res.status(400).send({ message: "No booking data provided." });
      }

      // Prepare message content
      const messageBody = {
        receive_id: chatID,
        msg_type: "interactive",
        content: JSON.stringify({
          type: "template",
          data: {
            template_id: "ctp_AABSV5by7rVK",
            template_variable: JSON.parse(bookingData),
          },
        }),
      };

      // Send message to chat
      const messageResponse = await fetchFromLark(
        "https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tenant_access_token}`,
          },
          body: JSON.stringify(messageBody),
        }
      );

      if (messageResponse) {
        res.send({ status: true }).status(200);
      }
    } catch (error: any) {
      console.error("Error in notifyBooking:", error);
      res
        .status(500)
        .send({ message: error.message || "Internal Server Error" });
    }
  },
};

// Function to format date to start of day (YYYY-MM-DD)
const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};
// Function to get the start of the week (Sunday)
const getStartOfWeek = (date: Date): string => {
  const day = date.getDay();
  const diff = date.getDate() - day;
  const startOfWeek = new Date(date.setDate(diff));
  return formatDate(startOfWeek);
};

// Function to get the start of the month (YYYY-MM)
const getStartOfMonth = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
};
const calculateAverage = (groups: any) => {
  return Object.keys(groups).map((key) => {
    const totalImpressions = groups[key].reduce(
      (sum: any, item: { impressions: any }) => sum + item.impressions,
      0
    );
    return {
      period: key,
      impressions: totalImpressions / groups[key].length,
    };
  });
};
const calculateTotal = (groups: any) => {
  return Object.keys(groups).map((key) => {
    const totalImpressions = groups[key].reduce(
      (sum: any, item: { impressions: any }) => sum + item.impressions,
      0
    );
    return {
      period: key,
      impressions: totalImpressions,
    };
  });
};

async function fetchFromLark(url: string, options: any) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error_msg || JSON.stringify(result));
  }
  return result;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

function getMidpoint(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Coordinates {
  // Convert degrees to radians
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const toDeg = (rad: number): number => (rad * 180) / Math.PI;

  const dLon = toRad(lon2 - lon1);

  // Convert lat/lon to radians
  lat1 = toRad(lat1);
  lat2 = toRad(lat2);
  lon1 = toRad(lon1);

  const Bx = Math.cos(lat2) * Math.cos(dLon);
  const By = Math.cos(lat2) * Math.sin(dLon);

  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + Bx) ** 2 + By ** 2)
  );
  const lon3 = lon1 + Math.atan2(By, Math.cos(lat1) + Bx);

  return {
    latitude: toDeg(lat3),
    longitude: toDeg(lon3),
  };
}

type Coordinate = {
  lat: number;
  lng: number;
  mmda_code?: string;
  mmda_road?: string;
};

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestCoord(
  target: Coordinate,
  coords: Coordinate[]
): Coordinate | null {
  let nearest: Coordinate | null = null;
  let minDistance = Infinity;

  for (const coord of coords) {
    const distance = getDistanceFromLatLonInKm(
      target.lat,
      target.lng,
      coord.lat,
      coord.lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = coord;
    }
  }

  return nearest;
}
