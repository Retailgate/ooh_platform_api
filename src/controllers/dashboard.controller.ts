import { Request, Response } from "express";
import { DBPG } from "../db/db-pg";
import fetch from "node-fetch";

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

    const owner = req.query.owner;
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
      console.log("basic query lang");
      sql = `SELECT s."site_id", s."site_code", "site", "area", COALESCE(sa."city",s."city") as city, "size", "segments", "region", sa."address", "latitude", "longitude", "site_owner", "board_facing","type", "price", "ideal_view", "imageURL", "remarks" 
      FROM "sites" s LEFT JOIN "site_additional" sa ON sa."site_code" = s."site_code"`; // `INSERT INTO "users"("user_id", "firstName", "lastName", "userName", "emailAddress") VALUES($1,$2,$3,$4,$5);`;

      if (owner) {
        console.log("query ng sites with Owner");
        sql += `WHERE "site_owner" LIKE '%${owner}%'`;
      }

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
    sql = `SELECT MAX(a.scmi_area) as road, MAX(s.area) as area , AVG(i.impressions) as impressions
          FROM area_map a
          JOIN sites s ON SUBSTRING(s.area,1,2) = a.ooh_area
          JOIN impressions i ON i.area = s.area
          WHERE s.site_code = $1`;
    params = [id];

    resSql = await DBPG.query(sql, params);
    area_code = resSql[0]["road"];
    impressions = resSql[0]["impressions"] ?? 0;

    //format the 'from' and 'to' dates to YYYY-MM-DD
    var from_f = from.split("-");
    var to_f = to.split("-");

    formatted_from = from_f[2] + "-" + from_f[0] + "-" + from_f[1];
    formatted_to = to_f[2] + "-" + to_f[0] + "-" + to_f[1];

    //SURVEYS sql query with from and to dates; count grouped by category, key, value
    sqlDate = `SELECT "response_id" FROM "surveys" WHERE "area" = $1
    AND created_at BETWEEN $2 AND $3 GROUP BY "response_id" ORDER BY "response_id";`;

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
          if (impressions === 0) {
            count = responsesCount;
          } else {
            count = Math.ceil((responsesCount / responseCount) * impressions);
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
      console.log(data);
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
      sql = `SELECT "category", "key", "value", "multi_resp", "parent_group"
      FROM "options"
      WHERE "category" != 'Profile' AND ("parent_group" <> 'area' OR "parent_group" IS NULL);`;
      params = [];
      resSql = await DBPG.query(sql, params);

      var data: any = [];
      for (let row in resSql) {
        data.push({
          category: resSql[row].category,
          question: resSql[row].key,
          key: resSql[row].value,
          multi: resSql[row].multi_resp,
          parent: resSql[row].parent_group,
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
      const region = parsedOptions.region;
      if (!date_from || !date_to) {
        res.status(400).send({ error: "Invalid date range." });
        return;
      }
      delete parsedOptions.dates;
      delete parsedOptions.region;

      const keys: string[] = Object.keys(parsedOptions);

      let initSQL = `
SELECT su.response_id, su.area, su.key, su.value, su.created_at
FROM surveys su
LEFT JOIN options op ON su.key = op.key AND su.value = op.vcode
WHERE su.created_at BETWEEN $1 AND $2
`;

      if (keys.length > 0) {
        const someConds: string[] = []; // OR group
        const allConds: string[] = []; // AND group

        keys.forEach((key) => {
          const selectedValues = parsedOptions[key].choices;
          const valuesSQL = selectedValues
            .map((v: string) => `'${v}'`)
            .join(",");

          if (!parsedOptions[key].allowMultiple) {
            // SOME (OR)
            someConds.push(`
        (su.key = '${key}'
         AND su.value IN (SELECT vcode FROM options WHERE value IN (${valuesSQL})))
      `);
          } else {
            // ALL (AND)
            allConds.push(`
        su.response_id IN (
          WITH selected AS (
            SELECT vcode FROM options WHERE value IN (${valuesSQL})
          )
          SELECT response_id
          FROM surveys
          WHERE key = '${key}'
            AND value IN (SELECT vcode FROM selected)
          GROUP BY response_id
          HAVING COUNT(DISTINCT value) = (SELECT COUNT(*) FROM selected)
        )
      `);
          }
        });

        const finalParts = [];

        if (allConds.length > 0) {
          finalParts.push(allConds.join(" AND "));
        }

        if (someConds.length > 0) {
          finalParts.push(`(${someConds.join(" OR ")})`);
        }

        if (finalParts.length > 0) {
          initSQL += ` AND (${finalParts.join(" AND ")})`;
        }
      }

      console.log(initSQL);

      const rawRes: any = await DBPG.query(initSQL, [date_from, date_to]);

      keys.push("created_at");
      // Step 1: Group responses by area and response_id
      const groupedByAreaAndResponseId = rawRes.reduce(
        (acc: any, item: any) => {
          if (!acc[item.area]) acc[item.area] = {};
          if (!acc[item.area][item.response_id])
            acc[item.area][item.response_id] = {};
          acc[item.area][item.response_id][item.key] =
            item.value === "NaN" ? 0 : Number(item.value);
          acc[item.area][item.response_id]["created_at"] = item.created_at;
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

      const resSql = `SELECT area, COUNT(DISTINCT s.response_id) AS total_responses FROM surveys s WHERE s.created_at BETWEEN $1 AND $2 GROUP BY area ORDER BY total_responses DESC`;
      const allRes: any = await DBPG.query(resSql, [date_from, date_to]);

      let siteParams: string[] = [];
      let conditions: string[] = [];
      const owner = req.query.owner;
      let siteQuery = `
  SELECT s.site_code, s.city, s.region, s.site_owner, s.area, a.scmi_area
  FROM area_map a
  JOIN sites s ON SUBSTRING(s.area, 1,2) = a.ooh_area
`;

      // Add region condition
      if (region !== "all") {
        conditions.push(`s.region = $${siteParams.length + 1}`);
        siteParams.push(region);
      }

      // Add owner condition
      if (owner) {
        conditions.push(`s.site_owner = $${siteParams.length + 1}`);
        siteParams.push(owner as string);
      }

      // Append WHERE clause if there are conditions
      if (conditions.length > 0) {
        siteQuery += ` WHERE ${conditions.join(" AND ")}`;
      }
      console.log(siteQuery)
      const resSite: any = await DBPG.query(siteQuery, siteParams);

      const responseData: any = {};
      for (const road in result) {
        if (!responseData[road]) {
          const currentRoad = allRes.find((res: any) => res.area === road);
          const sitesInRoad = resSite.filter(
            (site: any) => site.scmi_area === road
          );
          const rate =
            (result[road] / Number(currentRoad.total_responses)) * 100;

          if (sitesInRoad.length > 0) {
            responseData[road] = sitesInRoad.map((site: any) => {
              return {
                site_code: site.site_code,
                area: site.area,
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
