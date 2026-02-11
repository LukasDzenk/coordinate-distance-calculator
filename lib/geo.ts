import { geoInterpolate } from "d3-geo";

export type CoordinateMode = "globe" | "flat";

export type GlobeAlgorithm = "haversine" | "vincenty" | "equirect";
export type FlatAlgorithm = "euclidean2d" | "euclidean3d" | "manhattan2d";

export type AlgorithmId = GlobeAlgorithm | FlatAlgorithm;

export type ProjectionMode = "map" | "globe";

export interface GlobeCoordinate {
  lat: number;
  lon: number;
}

export interface FlatCoordinate {
  x: number;
  y: number;
  z: number;
}

export type OutputUnit = "m" | "km" | "mi" | "nmi" | "ft" | "blocks";

export interface ParseSuccess<T> {
  ok: true;
  value: T;
}

export interface ParseFailure {
  ok: false;
  error: string;
}

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

const EARTH_RADIUS_M = 6371008.8;
const WGS84_A = 6378137;
const WGS84_B = 6356752.314245;
const WGS84_F = 1 / 298.257223563;

const metersPerUnit: Record<OutputUnit, number> = {
  m: 1,
  km: 1000,
  mi: 1609.344,
  nmi: 1852,
  ft: 0.3048,
  blocks: 1
};

export const globeAlgorithms: GlobeAlgorithm[] = ["haversine", "vincenty", "equirect"];
export const flatAlgorithms: FlatAlgorithm[] = ["euclidean2d", "euclidean3d", "manhattan2d"];

export const algorithmMessageKey: Record<AlgorithmId, string> = {
  haversine: "algoHaversine",
  vincenty: "algoVincenty",
  equirect: "algoEquirect",
  euclidean2d: "algoEuclidean2D",
  euclidean3d: "algoEuclidean3D",
  manhattan2d: "algoManhattan"
};

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function toDeg(value: number): number {
  return (value * 180) / Math.PI;
}

function normalizeLon(lon: number): number {
  const normalized = ((lon + 540) % 360) - 180;
  return Number.isNaN(normalized) ? lon : normalized;
}

function parseCoordinatePairFromUrl(raw: string): [number, number] | null {
  const atPattern = raw.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (atPattern) {
    return [Number(atPattern[1]), Number(atPattern[2])];
  }

  try {
    const maybeUrl = new URL(raw);
    const q = maybeUrl.searchParams.get("q") ?? maybeUrl.searchParams.get("ll");
    if (q) {
      const qMatch = q.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
      if (qMatch) {
        return [Number(qMatch[1]), Number(qMatch[2])];
      }
    }
  } catch {
    return null;
  }

  return null;
}

function dmsToDecimal(degrees: string, minutes?: string, seconds?: string, hemi?: string): number {
  const deg = Math.abs(Number(degrees));
  const min = minutes ? Number(minutes) : 0;
  const sec = seconds ? Number(seconds) : 0;
  const sign = hemi && ["S", "W"].includes(hemi.toUpperCase()) ? -1 : 1;
  return sign * (deg + min / 60 + sec / 3600);
}

function parseDmsPair(raw: string): [number, number] | null {
  const text = raw.toUpperCase();

  const latLon = text.match(
    /(\d{1,3})\D+(\d{1,2})?\D*(\d{1,2}(?:\.\d+)?)?\D*([NS])[^\dA-Z]+(\d{1,3})\D+(\d{1,2})?\D*(\d{1,2}(?:\.\d+)?)?\D*([EW])/i
  );
  if (latLon) {
    const lat = dmsToDecimal(latLon[1], latLon[2], latLon[3], latLon[4]);
    const lon = dmsToDecimal(latLon[5], latLon[6], latLon[7], latLon[8]);
    return [lat, lon];
  }

  const lonLat = text.match(
    /(\d{1,3})\D+(\d{1,2})?\D*(\d{1,2}(?:\.\d+)?)?\D*([EW])[^\dA-Z]+(\d{1,3})\D+(\d{1,2})?\D*(\d{1,2}(?:\.\d+)?)?\D*([NS])/i
  );
  if (lonLat) {
    const lon = dmsToDecimal(lonLat[1], lonLat[2], lonLat[3], lonLat[4]);
    const lat = dmsToDecimal(lonLat[5], lonLat[6], lonLat[7], lonLat[8]);
    return [lat, lon];
  }

  return null;
}

function isValidLatLon(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function parseGlobeCoordinate(raw: string): ParseResult<GlobeCoordinate> {
  const input = raw.trim();
  if (!input) {
    return { ok: false, error: "empty" };
  }

  const urlPair = parseCoordinatePairFromUrl(input);
  if (urlPair) {
    const [lat, lon] = urlPair;
    if (!isValidLatLon(lat, lon)) {
      return { ok: false, error: "out_of_range" };
    }
    return { ok: true, value: { lat, lon: normalizeLon(lon) } };
  }

  const dmsPair = parseDmsPair(input);
  if (dmsPair) {
    const [lat, lon] = dmsPair;
    if (!isValidLatLon(lat, lon)) {
      return { ok: false, error: "out_of_range" };
    }
    return { ok: true, value: { lat, lon: normalizeLon(lon) } };
  }

  const labelPattern = input.match(
    /lat(?:itude)?\s*[:=]\s*(-?\d+(?:\.\d+)?)\s*[,;\s]+lon(?:gitude)?\s*[:=]\s*(-?\d+(?:\.\d+)?)/i
  );
  if (labelPattern) {
    const lat = Number(labelPattern[1]);
    const lon = Number(labelPattern[2]);
    if (!isValidLatLon(lat, lon)) {
      return { ok: false, error: "out_of_range" };
    }
    return { ok: true, value: { lat, lon: normalizeLon(lon) } };
  }

  const decimalPair = input.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
  if (decimalPair) {
    const lat = Number(decimalPair[1]);
    const lon = Number(decimalPair[2]);
    if (!isValidLatLon(lat, lon)) {
      return { ok: false, error: "out_of_range" };
    }
    return { ok: true, value: { lat, lon: normalizeLon(lon) } };
  }

  return { ok: false, error: "invalid_format" };
}

export function parseFlatCoordinate(raw: string): ParseResult<FlatCoordinate> {
  const values = raw
    .trim()
    .match(/-?\d+(?:\.\d+)?/g)
    ?.map(Number);

  if (!values || values.length < 2) {
    return { ok: false, error: "invalid_format" };
  }

  const [x, y, z = 0] = values;
  if (![x, y, z].every((value) => Number.isFinite(value))) {
    return { ok: false, error: "invalid_number" };
  }

  return { ok: true, value: { x, y, z } };
}

export function haversineDistanceMeters(a: GlobeCoordinate, b: GlobeCoordinate): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_M * c;
}

export function vincentyDistanceMeters(a: GlobeCoordinate, b: GlobeCoordinate): number {
  const L = toRad(b.lon - a.lon);
  const U1 = Math.atan((1 - WGS84_F) * Math.tan(toRad(a.lat)));
  const U2 = Math.atan((1 - WGS84_F) * Math.tan(toRad(b.lat)));

  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);

  let lambda = L;
  let lambdaP = 0;
  let iteration = 0;

  let sinSigma = 0;
  let cosSigma = 0;
  let sigma = 0;
  let sinAlpha = 0;
  let cosSqAlpha = 0;
  let cos2SigmaM = 0;

  while (Math.abs(lambda - lambdaP) > 1e-12 && iteration < 200) {
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);

    sinSigma = Math.sqrt(
      (cosU2 * sinLambda) * (cosU2 * sinLambda) +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) *
          (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda)
    );

    if (sinSigma === 0) {
      return 0;
    }

    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;

    if (cosSqAlpha === 0) {
      cos2SigmaM = 0;
    } else {
      cos2SigmaM = cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;
    }

    const C = (WGS84_F / 16) * cosSqAlpha * (4 + WGS84_F * (4 - 3 * cosSqAlpha));
    lambdaP = lambda;
    lambda =
      L +
      (1 - C) *
        WGS84_F *
        sinAlpha *
        (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));

    iteration += 1;
  }

  if (iteration >= 200) {
    return haversineDistanceMeters(a, b);
  }

  const uSq = (cosSqAlpha * (WGS84_A * WGS84_A - WGS84_B * WGS84_B)) / (WGS84_B * WGS84_B);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma =
    B *
    sinSigma *
    (cos2SigmaM +
      (B / 4) *
        (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
          (B / 6) *
            cos2SigmaM *
            (-3 + 4 * sinSigma * sinSigma) *
            (-3 + 4 * cos2SigmaM * cos2SigmaM)));

  return WGS84_B * A * (sigma - deltaSigma);
}

export function equirectangularDistanceMeters(a: GlobeCoordinate, b: GlobeCoordinate): number {
  const x = toRad(b.lon - a.lon) * Math.cos(toRad((a.lat + b.lat) / 2));
  const y = toRad(b.lat - a.lat);
  return Math.sqrt(x * x + y * y) * EARTH_RADIUS_M;
}

export function euclidean2DUnits(a: FlatCoordinate, b: FlatCoordinate): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function euclidean3DUnits(a: FlatCoordinate, b: FlatCoordinate): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.hypot(dx, dy, dz);
}

export function manhattan2DUnits(a: FlatCoordinate, b: FlatCoordinate): number {
  return Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
}

export function calculateGlobeDistanceMeters(
  algorithm: GlobeAlgorithm,
  a: GlobeCoordinate,
  b: GlobeCoordinate
): number {
  if (algorithm === "haversine") return haversineDistanceMeters(a, b);
  if (algorithm === "vincenty") return vincentyDistanceMeters(a, b);
  return equirectangularDistanceMeters(a, b);
}

export function calculateFlatDistanceUnits(
  algorithm: FlatAlgorithm,
  a: FlatCoordinate,
  b: FlatCoordinate
): number {
  if (algorithm === "euclidean2d") return euclidean2DUnits(a, b);
  if (algorithm === "euclidean3d") return euclidean3DUnits(a, b);
  return manhattan2DUnits(a, b);
}

export function toMeters(value: number, unit: OutputUnit): number {
  return value * metersPerUnit[unit];
}

export function fromMeters(value: number, unit: OutputUnit): number {
  return value / metersPerUnit[unit];
}

export function formatNumber(value: number): string {
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function geographicMidpoint(a: GlobeCoordinate, b: GlobeCoordinate): GlobeCoordinate {
  const lat1 = toRad(a.lat);
  const lon1 = toRad(a.lon);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);

  const bx = Math.cos(lat2) * Math.cos(dLon);
  const by = Math.cos(lat2) * Math.sin(dLon);

  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + bx) * (Math.cos(lat1) + bx) + by * by)
  );
  const lon3 = lon1 + Math.atan2(by, Math.cos(lat1) + bx);

  return { lat: toDeg(lat3), lon: normalizeLon(toDeg(lon3)) };
}

export function flatMidpoint(a: FlatCoordinate, b: FlatCoordinate): FlatCoordinate {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2
  };
}

export function initialBearingDegrees(a: GlobeCoordinate, b: GlobeCoordinate): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return bearing;
}

export function planarBearingDegrees(a: FlatCoordinate, b: FlatCoordinate): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

export function buildGreatCirclePath(
  a: GlobeCoordinate,
  b: GlobeCoordinate,
  steps = 96
): GlobeCoordinate[] {
  const interpolate = geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
  const points: GlobeCoordinate[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const [lon, lat] = interpolate(i / steps);
    points.push({ lat, lon });
  }
  return points;
}

function destinationPoint(center: GlobeCoordinate, bearingDeg: number, distanceMeters: number): GlobeCoordinate {
  const distanceRatio = distanceMeters / EARTH_RADIUS_M;
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(center.lat);
  const lon1 = toRad(center.lon);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceRatio) +
      Math.cos(lat1) * Math.sin(distanceRatio) * Math.cos(bearing)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(distanceRatio) * Math.cos(lat1),
      Math.cos(distanceRatio) - Math.sin(lat1) * Math.sin(lat2)
    );

  return { lat: toDeg(lat2), lon: normalizeLon(toDeg(lon2)) };
}

export function buildGeodesicCircle(
  center: GlobeCoordinate,
  radiusMeters: number,
  steps = 120
): GlobeCoordinate[] {
  const points: GlobeCoordinate[] = [];
  for (let i = 0; i <= steps; i += 1) {
    points.push(destinationPoint(center, (360 * i) / steps, radiusMeters));
  }
  return points;
}

export function buildFlatCircle(center: FlatCoordinate, radius: number, steps = 120): FlatCoordinate[] {
  const points: FlatCoordinate[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const theta = (2 * Math.PI * i) / steps;
    points.push({
      x: center.x + radius * Math.cos(theta),
      y: center.y + radius * Math.sin(theta),
      z: center.z
    });
  }
  return points;
}

export function formatGlobeCoordinate(point: GlobeCoordinate): string {
  return `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`;
}

export function formatFlatCoordinate(point: FlatCoordinate): string {
  return `${point.x.toFixed(3)}, ${point.y.toFixed(3)}, ${point.z.toFixed(3)}`;
}
