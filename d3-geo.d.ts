declare module "d3-geo" {
  export function geoEquirectangular(): GeoProjection;
  export function geoGraticule10(): GeoGraticule;
  export function geoInterpolate(a: [number, number], b: [number, number]): (t: number) => [number, number];
  export function geoOrthographic(): GeoProjection;
  export function geoPath(projection?: GeoProjection): (subject: unknown) => string | null;

  interface GeoProjection {
    rotate(rotation: [number, number]): this;
    translate(point: [number, number]): this;
    scale(value: number): this;
    clipAngle(angle: number): this;
    fitExtent(extent: [[number, number], [number, number]], object: unknown): this;
    (point: [number, number]): [number, number] | null;
  }

  interface GeoGraticule {
    (): unknown;
  }
}
