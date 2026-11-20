import { Request, Response } from "express";
import { DBPG } from "../db/db-pg";
import { getBoundingBox, haversine } from "../utils/helper";
import { Landmark } from "../utils/types";

export const MiscController = {
  async test(req: Request, res: Response) {
    res.status(200).send({
      success: true,
    });
  },
  async getTypes(_: Request, res: Response) {
    const response = await DBPG.query(
      "SELECT * FROM types ORDER BY type_id ASC;",
      [],
    );
    res.status(200).send(response);
  },
  async getSiteLandmarks(req: Request, res: Response) {
    try {
      const sites = String(req.query.sites ?? "")
        .split(",")
        .map((site) => site.trim())
        .filter(Boolean);

      const radius = req.query.d ? Number(req.query.d) : 300;

      if (!sites.length) {
        throw new Error("Site codes are missing.");
      }

      const siteRows: {
        latitude: number;
        longitude: number;
      }[] = await DBPG.query(
        `
            SELECT latitude, longitude
            FROM sites
            WHERE site_code = ANY($1::text[])
            `,
        [sites],
      );

      if (!siteRows.length) {
        throw new Error("Sites not found.");
      }

      const landmarkMap = new Map<
        Landmark["landmark_id"],
        Landmark & { distance: number }
      >();

      for (const site of siteRows) {
        const latitude = Number(site.latitude);
        const longitude = Number(site.longitude);

        const { minLat, maxLat, minLng, maxLng } = getBoundingBox(
          latitude,
          longitude,
          radius,
        );

        const rows: Landmark[] = await DBPG.query(
          `
                SELECT *
                FROM landmarks
                WHERE latitude BETWEEN $1 AND $2
                  AND longitude BETWEEN $3 AND $4
                `,
          [minLat, maxLat, minLng, maxLng],
        );

        for (const row of rows) {
          const distance = haversine(
            row.latitude,
            row.longitude,
            latitude,
            longitude,
            "m",
          );

          if (distance > radius) continue;

          const existing = landmarkMap.get(row.landmark_id);

          // Landmark already found near another site.
          // Keep whichever distance is shorter.
          if (existing) {
            if (distance < existing.distance) {
              landmarkMap.set(row.landmark_id, {
                ...row,
                distance,
              });
            }

            continue;
          }

          landmarkMap.set(row.landmark_id, {
            ...row,
            distance,
          });
        }
      }

      const landmarks = Array.from(landmarkMap.values()).sort(
        (a, b) => a.distance - b.distance,
      );

      res.status(200).send(landmarks);
    } catch (e: unknown) {
      res.status(400).json({
        message: (e as Error).message,
      });
    }
  },
  async getLandmarkCategories(_: Request, res: Response) {
    const response = await DBPG.query(
      "SELECT category as category_id, REPLACE(category, '_', ' ') AS category, COUNT(*) AS landmark_count FROM landmarks CROSS JOIN LATERAL unnest(categories) AS category GROUP BY category ORDER BY landmark_count DESC;",
      [],
    );
    res.status(200).send(response);
  },
  async getSitesByLandmarkCategory(req: Request, res: Response) {
    const categories = String(req.query.categories ?? "")
      .split(",")
      .map((category) => category.trim())
      .filter(Boolean);
    const distance = Number(req.query.distance ?? 300);

    if (!Number.isFinite(distance) || distance <= 0) {
      return res.status(400).json({
        message: "Invalid distance",
      });
    }

    const response = await DBPG.query(
      `
            SELECT
                s.site_code,
                s.site_id,
                s.id,
                nearby.landmark_count
            FROM sites s

            CROSS JOIN LATERAL (
                SELECT COUNT(*)::int AS landmark_count
                FROM landmarks l

                WHERE l.categories && $1::text[]

                -- Bounding box first
                AND l.latitude BETWEEN
                    s.latitude::DOUBLE PRECISION - ($2 / 111320.0)
                    AND
                    s.latitude::DOUBLE PRECISION + ($2 / 111320.0)

                AND l.longitude BETWEEN
                    s.longitude::DOUBLE PRECISION - (
                        $2 / (
                            111320.0 *
                            COS(RADIANS(s.latitude::DOUBLE PRECISION))
                        )
                    )
                    AND
                    s.longitude::DOUBLE PRECISION + (
                        $2 / (
                            111320.0 *
                            COS(RADIANS(s.latitude::DOUBLE PRECISION))
                        )
                    )

                -- Exact Haversine distance
                AND 6371000 * 2 * ASIN(
                    SQRT(
                        POWER(
                            SIN(
                                RADIANS(l.latitude - s.latitude::DOUBLE PRECISION) / 2
                            ),
                            2
                        )
                        +
                        COS(RADIANS(s.latitude::DOUBLE PRECISION))
                        *
                        COS(RADIANS(l.latitude))
                        *
                        POWER(
                            SIN(
                                RADIANS(l.longitude - s.longitude::DOUBLE PRECISION) / 2
                            ),
                            2
                        )
                    )
                ) <= $2

            ) nearby

            WHERE nearby.landmark_count > 0

            ORDER BY nearby.landmark_count DESC
            `,
      [categories, distance],
    );
    res.status(200).send(response);
  },
};
