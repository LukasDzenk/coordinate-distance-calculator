"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GlobeCoordinate } from "@/lib/geo";
import { geographicMidpoint } from "@/lib/geo";

interface AlgorithmPath {
  id: string;
  color: string;
  globePath?: GlobeCoordinate[];
}

interface GlobeMapLibreProps {
  projectionMode: "map" | "globe";
  pointA?: GlobeCoordinate;
  pointB?: GlobeCoordinate;
  centerPoint?: GlobeCoordinate;
  radiusPath?: GlobeCoordinate[];
  algorithmPaths: AlgorithmPath[];
  zoomToPoint?: { lat: number; lon: number } | null;
  zoomFitBoth?: boolean;
  zoomToCenter?: boolean;
  onZoomComplete?: () => void;
}

const DEFAULT_CENTER: [number, number] = [0, 20];
const DEFAULT_ZOOM = 2;

function applyProjection(map: maplibregl.Map, mode: "map" | "globe") {
  try {
    map.setProjection({ type: mode === "globe" ? "globe" : "mercator" });
  } catch {
    // ignore
  }
}

function buildOSMStyle(projectionMode: "map" | "globe"): StyleSpecification {
  const projection = projectionMode === "globe" ? { type: "globe" as const } : { type: "mercator" as const };
  return {
    version: 8,
    name: "osm-streets",
    projection,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: "osm-tiles",
        type: "raster",
        source: "osm",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };
}

const ZOOM_TO_POINT_ZOOM = 12;

export function GlobeMapLibre({
  projectionMode,
  pointA,
  pointB,
  centerPoint,
  radiusPath,
  algorithmPaths,
  zoomToPoint,
  zoomFitBoth,
  zoomToCenter,
  onZoomComplete,
}: GlobeMapLibreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const skipNextFitBoundsRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const style = buildOSMStyle(projectionMode);

    const map = new maplibregl.Map({
      container,
      style,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

    map.on("load", () => {
      mapRef.current = map;
      applyProjection(map, projectionMode);

      // Points: A, B, center
      map.addSource("points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "points",
        type: "circle",
        source: "points",
        paint: {
          "circle-radius": 8,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });
      map.addLayer({
        id: "points-labels",
        type: "symbol",
        source: "points",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 11,
          "text-anchor": "left",
          "text-offset": [1.2, 0],
        },
        paint: {
          "text-color": "hsl(220 15% 18%)",
          "text-halo-color": "#fff",
          "text-halo-width": 1.5,
        },
      });

      // Routes (algorithm paths)
      map.addSource("routes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "routes",
        type: "line",
        source: "routes",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 3,
          "line-opacity": 0.9,
        },
        layout: { "line-join": "round", "line-cap": "round" },
      });

      // Radius
      map.addSource("radius", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius",
        paint: {
          "fill-color": "#2563eb",
          "fill-opacity": 0.08,
        },
      });
      map.addLayer({
        id: "radius-line",
        type: "line",
        source: "radius",
        paint: {
          "line-color": "#2563eb",
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- map created once with initial projectionMode
  }, []);

  // Update projection when mode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    applyProjection(map, projectionMode);
  }, [projectionMode]);

  // Update data layers when points/routes/radius change
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource("points")) return;

    const pointFeatures: GeoJSON.Feature<GeoJSON.Point, { color: string; label: string }>[] = [];
    if (pointA) {
      pointFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [pointA.lon, pointA.lat] },
        properties: { color: "#1d4ed8", label: "Point A" },
      });
    }
    if (pointB) {
      pointFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [pointB.lon, pointB.lat] },
        properties: { color: "#15803d", label: "Point B" },
      });
    }
    if (centerPoint) {
      pointFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [centerPoint.lon, centerPoint.lat] },
        properties: { color: "#2563eb", label: "Center" },
      });
    }
    (map.getSource("points") as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: pointFeatures,
    });

    const routeFeatures: GeoJSON.Feature<GeoJSON.LineString, { color: string }>[] =
      algorithmPaths
        .filter((p) => p.globePath && p.globePath.length >= 2)
        .map((p) => ({
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: p.globePath!.map((c) => [c.lon, c.lat]),
          },
          properties: { color: p.color },
        }));
    (map.getSource("routes") as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: routeFeatures,
    });

    let radiusFeature: GeoJSON.Feature<GeoJSON.Polygon> | null = null;
    if (radiusPath && radiusPath.length >= 2) {
      const coords = radiusPath.map((c) => [c.lon, c.lat]);
      coords.push(coords[0]);
      radiusFeature = {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [coords] },
        properties: {},
      };
    }
    (map.getSource("radius") as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: radiusFeature ? [radiusFeature] : [],
    });

    if (zoomToPoint) {
      map.flyTo({
        center: [zoomToPoint.lon, zoomToPoint.lat],
        zoom: ZOOM_TO_POINT_ZOOM,
        duration: 400,
      });
      skipNextFitBoundsRef.current = true;
      onZoomComplete?.();
      return;
    }

    if (zoomToCenter && centerPoint) {
      if (radiusPath && radiusPath.length > 0) {
        const lngs = radiusPath.map((c) => c.lon);
        const lats = radiusPath.map((c) => c.lat);
        try {
          map.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: 48, maxZoom: 14, duration: 400 }
          );
        } catch {
          map.flyTo({
            center: [centerPoint.lon, centerPoint.lat],
            zoom: ZOOM_TO_POINT_ZOOM,
            duration: 400,
          });
        }
      } else {
        map.flyTo({
          center: [centerPoint.lon, centerPoint.lat],
          zoom: ZOOM_TO_POINT_ZOOM,
          duration: 400,
        });
      }
      skipNextFitBoundsRef.current = true;
      onZoomComplete?.();
      return;
    }

    if (zoomFitBoth && pointA && pointB) {
      try {
        map.fitBounds(
          [
            [Math.min(pointA.lon, pointB.lon), Math.min(pointA.lat, pointB.lat)],
            [Math.max(pointA.lon, pointB.lon), Math.max(pointA.lat, pointB.lat)],
          ],
          { padding: 48, maxZoom: 14, duration: 400 }
        );
      } catch {
        // ignore
      }
      skipNextFitBoundsRef.current = true;
      onZoomComplete?.();
      return;
    }

    if (skipNextFitBoundsRef.current) {
      skipNextFitBoundsRef.current = false;
      return;
    }

    // Fit bounds to points with padding
    const allLngLat: [number, number][] = [];
    if (pointA) allLngLat.push([pointA.lon, pointA.lat]);
    if (pointB) allLngLat.push([pointB.lon, pointB.lat]);
    if (centerPoint) allLngLat.push([centerPoint.lon, centerPoint.lat]);
    if (radiusPath) radiusPath.forEach((c) => allLngLat.push([c.lon, c.lat]));
    algorithmPaths.forEach((p) => {
      p.globePath?.forEach((c) => allLngLat.push([c.lon, c.lat]));
    });

    if (allLngLat.length >= 2) {
      const lngs = allLngLat.map((c) => c[0]);
      const lats = allLngLat.map((c) => c[1]);
      try {
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 48, maxZoom: 14, duration: 0 }
        );
      } catch {
        // ignore
      }
    } else if (allLngLat.length === 1) {
      map.flyTo({ center: allLngLat[0], zoom: 10, duration: 0 });
    } else {
      const focus =
        centerPoint ??
        (pointA && pointB ? geographicMidpoint(pointA, pointB) : pointA) ?? { lat: 20, lon: 0 };
      map.flyTo({ center: [focus.lon, focus.lat], zoom: DEFAULT_ZOOM, duration: 0 });
    }
  }, [pointA, pointB, centerPoint, radiusPath, algorithmPaths, mapReady, zoomToPoint, zoomFitBoth, zoomToCenter]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 size-full"
      role="img"
      aria-label="Interactive map — scroll to zoom, drag to pan"
    />
  );
}
