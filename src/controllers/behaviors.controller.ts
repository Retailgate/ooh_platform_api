import { Request, Response } from "express";
import { DBPG } from "../db/db-pg";
import { PlanningRequest } from "../utils/types";
import { Impressions } from "./middleware.controller";

export const BehaviorsController = {
  async test(_: Request, res: Response) {
    res.status(200).send({
      success: true,
    });
  },
  async getOptions(req: Request, res: Response) {
    const response = await DBPG.query(
      `SELECT category, key as question, value as key, multi_resp as allowed_multiple, parent_group as parent, type FROM options WHERE category != 'Profile' AND (parent_group <> 'area' OR parent_group IS NULL)`,
      [],
    );
    res.status(200).send(response);
  },
  async getPlanningResults(req: Request, res: Response) {
    const { dates, region = "", filters = [] } = req.body as PlanningRequest;

    const dateFrom = dates?.from || null;
    const dateTo = dates?.to || null;

    const sql = `
      WITH selected_filters AS (
        SELECT
          f.key,
          f.choices,
          f.allow_multiple
        FROM jsonb_to_recordset($1::jsonb) AS f(
          key TEXT,
          choices TEXT[],
          allow_multiple BOOLEAN
        )
      ),

      selected_options AS (
        SELECT DISTINCT
          f.key,
          op.vcode,
          f.allow_multiple
        FROM selected_filters f
        JOIN options op
          ON op.key = f.key
          AND op.value = ANY(f.choices)
      ),

      matched_questions AS (
        SELECT
          s.response_id,
          s.area,
          so.key
        FROM surveys s
        JOIN selected_options so
          ON s.key = so.key
          AND s.value = so.vcode
        GROUP BY
          s.response_id,
          s.area,
          so.key,
          so.allow_multiple
        HAVING
          NOT so.allow_multiple
          OR COUNT(DISTINCT s.value) = (
            SELECT COUNT(DISTINCT vcode)
            FROM selected_options
            WHERE key = so.key
          )
      )
          
    , matched_respondents AS (
        SELECT
          area,
          response_id
        FROM matched_questions
        GROUP BY area, response_id
        HAVING COUNT(DISTINCT key) = (
          SELECT COUNT(*) FROM selected_filters
        )
      ),

      totals AS (
        SELECT
          area,
          COUNT(DISTINCT response_id) AS total_responses
        FROM surveys
        GROUP BY area
      ),

      fits AS (
        SELECT
          area,
          COUNT(*) AS fits_no
        FROM matched_respondents
        GROUP BY area
      )

      SELECT
        t.area,
        t.total_responses,
        CASE
          WHEN $1::jsonb = '[]'::jsonb
            THEN t.total_responses
          ELSE COALESCE(f.fits_no, 0)
        END AS fits_no,
        ROUND(
          CASE
            WHEN $1::jsonb = '[]'::jsonb THEN 100
            ELSE COALESCE(f.fits_no, 0)::numeric
                / NULLIF(t.total_responses, 0) * 100
          END,
          2
        ) AS fits_rate
      FROM totals t
      LEFT JOIN fits f ON f.area = t.area
      ORDER BY fits_rate DESC;
    `;

    const normalizedFilters = filters.map((filter) => ({
      key: filter.key,
      choices: [...new Set(filter.choices)],
      allow_multiple: filter.matchAll,
    }));

    const results = await DBPG.query(sql, [JSON.stringify(normalizedFilters)]);

    const audienceByArea = results.map((row: any) => ({
      area: row.area,
      total_responses: Number(row.total_responses),
      fits_no: Number(row.fits_no),
      fits_rate: Number(row.fits_rate),
    }));

    const siteSQL = `
      SELECT
        s.site_code,
        s.site_id,
        s.id,
        s.size,
        s.area,
        s.city,
        s.region,
        s.address,
        s.board_facing,
        c.name as company,
        a.scmi_area,
        s.ideal_view
      FROM sites s
      JOIN companies c
        ON c.company_id = s.company_id
        JOIN area_map a
        ON SUBSTRING(s.area, 1, 2) = a.ooh_area
      WHERE ($1::text IS NULL OR s.region = $1)
    `;

    const sites = await DBPG.query(siteSQL, [region?.trim() || null]);

    const sitesByCity = new Map<string, typeof sites>();

    for (const site of sites) {
      const city = site.city;

      if (!sitesByCity.has(city)) {
        sitesByCity.set(city, []);
      }

      sitesByCity.get(city)!.push(site);
    }

    const areas = [...new Set(sites.map((site) => site.area))];

    const impressions = await Impressions.getBulkAverage(
      areas,
      dateFrom,
      dateTo,
    );

    const impressionsByArea = new Map(
      impressions.map((item) => [item.area, Number(item.impressions ?? 0)]),
    );
    const audienceMap = new Map(
      audienceByArea.map((item) => [item.area, item]),
    );

    const finalResults = [...sitesByCity.entries()].map(([city, citySites]) => {
      const surveyAreas = [
        ...new Set(citySites.map((site) => site.scmi_area).filter(Boolean)),
      ];

      const audiences = surveyAreas
        .map((area) => audienceMap.get(area))
        .filter(
          (item): item is (typeof audienceByArea)[number] => item != null,
        );

      const total_responses = audiences.reduce(
        (sum, item) => sum + item.total_responses,
        0,
      );

      const fits_no = audiences.reduce((sum, item) => sum + item.fits_no, 0);

      const fits_rate = total_responses
        ? Number(((fits_no / total_responses) * 100).toFixed(2))
        : 0;

      return {
        city,
        total_responses,
        fits_no,
        fits_rate,
        sites: citySites.map(({ scmi_area, ...site }) => ({
          ...site,
          avg_daily_impressions: impressionsByArea.get(site.area) ?? 0,
        })),
      };
    });

    return res.status(200).json(finalResults);
  },
  async getSiteBehaviors(req: Request, res: Response) {
    try {
      const { site_code, dates } = req.query;

      if (typeof site_code !== "string" || !site_code.trim()) {
        return res.status(400).json({
          message: "Site code is required.",
        });
      }

      const { from, to } = dates as { from: string; to: string };

      const dateFrom = from;
      const dateTo = to;

      // 1. Get site information and impressions
      const [site]: {
        area: string;
        road: string | null;
      }[] = await DBPG.query(
        `
      SELECT
        s.area,
        (
          SELECT MAX(a.scmi_area)
          FROM area_map a
          WHERE a.ooh_area = SUBSTRING(s.area, 1, 2)
        ) AS road
      FROM sites s
      WHERE s.site_code = $1
      `,
        [site_code],
      );

      if (!site) {
        return res.status(404).json({
          message: "Site not found.",
        });
      }

      if (!site.road) {
        return res.status(200).json([]);
      }

      // 2. Aggregate survey answers directly in PostgreSQL
      const rows: {
        category: string;
        question: string;
        choice: string;
        responses_count: number;
        total_responses: number;

        /**
         *  AND ($2::date IS NULL OR created_at >= $2::date)
          AND ($3::date IS NULL OR created_at < $3::date + INTERVAL '1 day')
         */
      }[] = await DBPG.query(
        `
      WITH filtered_surveys AS (
        SELECT
          response_id,
          category,
          "key",
          value
        FROM surveys
        WHERE area = $1),
      totals AS (
        SELECT COUNT(DISTINCT response_id)::int AS total_responses
        FROM filtered_surveys
      )
      SELECT
        s.category,
        s."key" AS question,
        o.value AS choice,
        COUNT(*)::int AS responses_count,
        t.total_responses
      FROM filtered_surveys s
      JOIN options o
        ON o.vcode = s.value
       AND o."key" = s."key"
      CROSS JOIN totals t
      GROUP BY
        s.category,
        s."key",
        o.value,
        t.total_responses
      ORDER BY
        s.category,
        s."key",
        o.value
      `,
        [site.road],
      );

      // 3. Transform the aggregated results
      const impressions =
        (await Impressions.getAverage(site.area, dateFrom, dateTo)) ?? 0;

      const audiences = new Map<
        string,
        {
          category: string;
          question: string;
          responses: { choice: string; count: number }[];
        }
      >();

      for (const row of rows) {
        const key = JSON.stringify([row.category, row.question]);

        if (!audiences.has(key)) {
          audiences.set(key, {
            category: row.category,
            question: row.question,
            responses: [],
          });
        }

        const count =
          impressions === 0
            ? row.responses_count
            : row.total_responses > 0
              ? Math.ceil(
                  (row.responses_count / row.total_responses) * impressions,
                )
              : 0;

        audiences.get(key)!.responses.push({
          choice: row.choice,
          count,
        });
      }

      return res.status(200).json([...audiences.values()]);
    } catch (error) {
      console.error("getSiteBehaviors:", error);

      return res.status(500).json({
        message: "Failed to retrieve site behaviors.",
      });
    }
  },
};
