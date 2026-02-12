"use client";

import { useEffect, useRef } from "react";
import countries110m from "world-atlas/countries-110m.json";
import { feature } from "topojson-client";
import { select } from "d3-selection";
import { zoom } from "d3-zoom";
import {
  geoEquirectangular,
  geoGraticule10,
  geoOrthographic,
  geoPath
} from "d3-geo";
import {
  CoordinateMode,
  FlatCoordinate,
  GlobeCoordinate,
  ProjectionMode,
  geographicMidpoint
} from "@/lib/geo";
import { GlobeMapLibre } from "@/components/GlobeMapLibre";

interface AlgorithmPath {
  id: string;
  color: string;
  globePath?: GlobeCoordinate[];
  flatPath?: FlatCoordinate[];
}

interface CoordinateVisualizerProps {
  mode: CoordinateMode;
  projection: ProjectionMode;
  pointA?: GlobeCoordinate | FlatCoordinate;
  pointB?: GlobeCoordinate | FlatCoordinate;
  centerPoint?: GlobeCoordinate | FlatCoordinate;
  radiusGlobePath?: GlobeCoordinate[];
  radiusFlatPath?: FlatCoordinate[];
  algorithmPaths: AlgorithmPath[];
  zoomToPoint?: { lat: number; lon: number } | null;
  zoomFitBoth?: boolean;
  zoomToCenter?: boolean;
  onZoomComplete?: () => void;
}

const VIS_WIDTH = 980;
const VIS_HEIGHT = 540;

const landFeature = feature(
  countries110m as never,
  (countries110m as { objects: { countries: unknown } }).objects.countries as never
) as never;

function projectPoint(point: GlobeCoordinate, projection: { (point: [number, number]): [number, number] | null }) {
  return projection([point.lon, point.lat]);
}

function toLineString(points: GlobeCoordinate[]) {
  return {
    type: "LineString",
    coordinates: points.map((point) => [point.lon, point.lat])
  } as const;
}

const WATER_FILL = "hsl(205 45% 96%)";
const WATER_STROKE = "hsl(205 30% 90%)";
const LAND_FILL = "hsl(42 24% 92%)";
const LAND_STROKE = "hsl(42 20% 82%)";
const GRATICULE_STROKE = "hsl(210 25% 90%)";
const ROUTE_FILL = "hsl(221 83% 53% / 0.08)";
const ROUTE_STROKE = "hsl(221 83% 48% / 0.65)";
const POINT_A_FILL = "hsl(221 83% 38%)";
const POINT_B_FILL = "hsl(160 55% 32%)";
const POINT_CENTER_FILL = "hsl(0 0% 100%)";
const POINT_CENTER_STROKE = "hsl(221 83% 53%)";

function GlobePanel({
  projectionMode,
  pointA,
  pointB,
  centerPoint,
  radiusPath,
  algorithmPaths
}: {
  projectionMode: ProjectionMode;
  pointA?: GlobeCoordinate;
  pointB?: GlobeCoordinate;
  centerPoint?: GlobeCoordinate;
  radiusPath?: GlobeCoordinate[];
  algorithmPaths: AlgorithmPath[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomGroupRef = useRef<SVGGElement>(null);

  const sphere = { type: "Sphere" } as const;
  const focus =
    centerPoint ??
    (pointA && pointB ? geographicMidpoint(pointA, pointB) : pointA) ?? { lat: 18, lon: 0 };

  const projection =
    projectionMode === "globe"
      ? geoOrthographic()
          .rotate([-focus.lon, -focus.lat])
          .translate([VIS_WIDTH / 2, VIS_HEIGHT / 2])
          .scale(Math.min(VIS_WIDTH, VIS_HEIGHT) * 0.44)
          .clipAngle(90)
      : geoEquirectangular().fitExtent(
          [
            [28, 28],
            [VIS_WIDTH - 28, VIS_HEIGHT - 28]
          ],
          sphere
        );

  const pathBuilder = geoPath(projection);
  const graticule = geoGraticule10();

  const aProjected = pointA ? projectPoint(pointA, projection as (p: [number, number]) => [number, number]) : null;
  const bProjected = pointB ? projectPoint(pointB, projection as (p: [number, number]) => [number, number]) : null;
  const centerProjected = centerPoint ? projectPoint(centerPoint, projection as (p: [number, number]) => [number, number]) : null;

  useEffect(() => {
    const svg = svgRef.current;
    const g = zoomGroupRef.current;
    if (!svg || !g) return;

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 12])
      .on("zoom", (event) => {
        select(g).attr("transform", event.transform.toString());
      });

    select(svg).call(zoomBehavior);
  }, []);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 size-full cursor-grab touch-none object-contain active:cursor-grabbing"
      viewBox={`0 0 ${VIS_WIDTH} ${VIS_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Coordinate map visualization — scroll to zoom, drag to pan"
    >
      <g ref={zoomGroupRef}>
        <rect x={0} y={0} width={VIS_WIDTH} height={VIS_HEIGHT} fill={WATER_FILL} />

        {projectionMode === "globe" ? (
          <path
            d={pathBuilder(sphere) ?? undefined}
            fill={WATER_STROKE}
            stroke={LAND_STROKE}
            strokeWidth={1.2}
          />
        ) : null}

        <path
          d={pathBuilder(graticule) ?? undefined}
          fill="none"
          stroke={GRATICULE_STROKE}
          strokeWidth={0.5}
        />
        <path
          d={pathBuilder(landFeature as never) ?? undefined}
          fill={LAND_FILL}
          stroke={LAND_STROKE}
          strokeWidth={0.5}
        />

        {radiusPath && radiusPath.length > 1 ? (
          <path
            d={pathBuilder(toLineString(radiusPath) as never) ?? undefined}
            fill={ROUTE_FILL}
            stroke={ROUTE_STROKE}
            strokeDasharray="6 4"
            strokeWidth={1.4}
          />
        ) : null}

        {algorithmPaths.map((path) =>
          path.globePath && path.globePath.length > 1 ? (
            <path
              key={path.id}
              d={pathBuilder(toLineString(path.globePath) as never) ?? undefined}
              fill="none"
              stroke={path.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={0.92}
            />
          ) : null
        )}

        {aProjected ? (
          <circle cx={aProjected[0]} cy={aProjected[1]} r={6} fill={POINT_A_FILL} stroke="white" strokeWidth={1.5} />
        ) : null}
        {bProjected ? (
          <circle cx={bProjected[0]} cy={bProjected[1]} r={6} fill={POINT_B_FILL} stroke="white" strokeWidth={1.5} />
        ) : null}
        {centerProjected ? (
          <circle
            cx={centerProjected[0]}
            cy={centerProjected[1]}
            r={5}
            fill={POINT_CENTER_FILL}
            stroke={POINT_CENTER_STROKE}
            strokeWidth={1.5}
          />
        ) : null}
      </g>
    </svg>
  );
}

function FlatPanel({
  pointA,
  pointB,
  centerPoint,
  radiusPath,
  algorithmPaths
}: {
  pointA?: FlatCoordinate;
  pointB?: FlatCoordinate;
  centerPoint?: FlatCoordinate;
  radiusPath?: FlatCoordinate[];
  algorithmPaths: AlgorithmPath[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomGroupRef = useRef<SVGGElement>(null);

  const allPoints: FlatCoordinate[] = [];

  if (pointA) allPoints.push(pointA);
  if (pointB) allPoints.push(pointB);
  if (centerPoint) allPoints.push(centerPoint);
  if (radiusPath) allPoints.push(...radiusPath);

  for (const path of algorithmPaths) {
    if (path.flatPath) allPoints.push(...path.flatPath);
  }

  const minX = (allPoints.length ? Math.min(...allPoints.map((point) => point.x)) : -10) - 8;
  const maxX = (allPoints.length ? Math.max(...allPoints.map((point) => point.x)) : 10) + 8;
  const minY = (allPoints.length ? Math.min(...allPoints.map((point) => point.y)) : -10) - 8;
  const maxY = (allPoints.length ? Math.max(...allPoints.map((point) => point.y)) : 10) + 8;

  const xRange = Math.max(1, maxX - minX);
  const yRange = Math.max(1, maxY - minY);

  const margin = 32;
  const projectX = (x: number) => margin + ((x - minX) / xRange) * (VIS_WIDTH - margin * 2);
  const projectY = (y: number) => VIS_HEIGHT - margin - ((y - minY) / yRange) * (VIS_HEIGHT - margin * 2);

  const ticks = 10;

  useEffect(() => {
    const svg = svgRef.current;
    const g = zoomGroupRef.current;
    if (!svg || !g) return;

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 12])
      .on("zoom", (event) => {
        select(g).attr("transform", event.transform.toString());
      });

    select(svg).call(zoomBehavior);
  }, []);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 size-full cursor-grab touch-none object-contain active:cursor-grabbing"
      viewBox={`0 0 ${VIS_WIDTH} ${VIS_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Flat coordinate plane — scroll to zoom, drag to pan"
    >
      <g ref={zoomGroupRef}>
        <rect x={0} y={0} width={VIS_WIDTH} height={VIS_HEIGHT} fill={WATER_FILL} />

        {Array.from({ length: ticks + 1 }).map((_, index) => {
          const xValue = minX + (xRange * index) / ticks;
          const yValue = minY + (yRange * index) / ticks;
          return (
            <g key={index}>
              <line
                x1={projectX(xValue)}
                y1={margin}
                x2={projectX(xValue)}
                y2={VIS_HEIGHT - margin}
                stroke={GRATICULE_STROKE}
                strokeWidth={0.5}
              />
              <line
                x1={margin}
                y1={projectY(yValue)}
                x2={VIS_WIDTH - margin}
                y2={projectY(yValue)}
                stroke={GRATICULE_STROKE}
                strokeWidth={0.5}
              />
            </g>
          );
        })}

        {minX <= 0 && maxX >= 0 ? (
          <line
            x1={projectX(0)}
            y1={margin}
            x2={projectX(0)}
            y2={VIS_HEIGHT - margin}
            stroke={LAND_STROKE}
            strokeWidth={1.2}
          />
        ) : null}
        {minY <= 0 && maxY >= 0 ? (
          <line
            x1={margin}
            y1={projectY(0)}
            x2={VIS_WIDTH - margin}
            y2={projectY(0)}
            stroke={LAND_STROKE}
            strokeWidth={1.2}
          />
        ) : null}

        {radiusPath && radiusPath.length > 1 ? (
          <polyline
            points={radiusPath.map((point) => `${projectX(point.x)},${projectY(point.y)}`).join(" ")}
            fill={ROUTE_FILL}
            stroke={ROUTE_STROKE}
            strokeDasharray="6 4"
            strokeWidth={1.4}
          />
        ) : null}

        {algorithmPaths.map((path) =>
          path.flatPath && path.flatPath.length > 1 ? (
            <polyline
              key={path.id}
              points={path.flatPath.map((point) => `${projectX(point.x)},${projectY(point.y)}`).join(" ")}
              fill="none"
              stroke={path.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null
        )}

        {pointA ? (
          <g>
            <circle
              cx={projectX(pointA.x)}
              cy={projectY(pointA.y)}
              r={6}
              fill={POINT_A_FILL}
              stroke="white"
              strokeWidth={1.5}
            />
            <text
              x={projectX(pointA.x) + 10}
              y={projectY(pointA.y)}
              textAnchor="start"
              dominantBaseline="middle"
              fill="hsl(220 15% 18%)"
              style={{ fontSize: 11, fontWeight: 500, paintOrder: "stroke", stroke: "white", strokeWidth: 2 }}
            >
              Point A
            </text>
          </g>
        ) : null}
        {pointB ? (
          <g>
            <circle
              cx={projectX(pointB.x)}
              cy={projectY(pointB.y)}
              r={6}
              fill={POINT_B_FILL}
              stroke="white"
              strokeWidth={1.5}
            />
            <text
              x={projectX(pointB.x) + 10}
              y={projectY(pointB.y)}
              textAnchor="start"
              dominantBaseline="middle"
              fill="hsl(220 15% 18%)"
              style={{ fontSize: 11, fontWeight: 500, paintOrder: "stroke", stroke: "white", strokeWidth: 2 }}
            >
              Point B
            </text>
          </g>
        ) : null}
        {centerPoint ? (
          <circle
            cx={projectX(centerPoint.x)}
            cy={projectY(centerPoint.y)}
            r={5}
            fill={POINT_CENTER_FILL}
            stroke={POINT_CENTER_STROKE}
            strokeWidth={1.5}
          />
        ) : null}
      </g>
    </svg>
  );
}

export function CoordinateVisualizer(props: CoordinateVisualizerProps) {
  if (props.mode === "globe") {
    return (
      <GlobeMapLibre
        projectionMode={props.projection}
        pointA={props.pointA as GlobeCoordinate | undefined}
        pointB={props.pointB as GlobeCoordinate | undefined}
        centerPoint={props.centerPoint as GlobeCoordinate | undefined}
        radiusPath={props.radiusGlobePath}
        algorithmPaths={props.algorithmPaths}
        zoomToPoint={props.zoomToPoint}
        zoomFitBoth={props.zoomFitBoth}
        zoomToCenter={props.zoomToCenter}
        onZoomComplete={props.onZoomComplete}
      />
    );
  }

  return (
    <FlatPanel
      pointA={props.pointA as FlatCoordinate | undefined}
      pointB={props.pointB as FlatCoordinate | undefined}
      centerPoint={props.centerPoint as FlatCoordinate | undefined}
      radiusPath={props.radiusFlatPath}
      algorithmPaths={props.algorithmPaths}
    />
  );
}
