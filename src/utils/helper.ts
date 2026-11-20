import { segments } from "./segments";
import { Routes } from "./types";

export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit: "km" | "m" = "km",
): number {
  const R = unit === "km" ? 6371 : 6_371_000; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getBoundingBox(
  latitude: number,
  longitude: number,
  radiusMeters: number = 300,
) {
  const radiusKm = radiusMeters / 1000;

  const latDelta = radiusKm / 111.32;

  const lngDelta = radiusKm / (111.32 * Math.cos((latitude * Math.PI) / 180));

  return {
    minLat: latitude - latDelta,
    maxLat: latitude + latDelta,
    minLng: longitude - lngDelta,
    maxLng: longitude + lngDelta,
  };
}

export function getInitials(name: string): string {
  if (!name) return "";

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function getArea(lat: number | string, lng: number | string) {
  const routes: Routes = segments;
  let nearest = { areaCode: "", distance: Infinity };

  for (const [areaCode, routeGroup] of Object.entries(routes)) {
    for (const route of Object.values(routeGroup)) {
      const points = [...route.origin, ...route.destination];

      for (const point of points) {
        const distance = haversine(
          Number(lat),
          Number(lng),
          parseFloat(point.lat),
          parseFloat(point.lng),
        );

        if (distance < nearest.distance) {
          nearest = { areaCode, distance };
        }
      }
    }
  }
  return nearest;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}