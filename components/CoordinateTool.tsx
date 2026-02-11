"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Dictionary, t } from "@/lib/i18n";
import {
  AlgorithmId,
  CoordinateMode,
  FlatAlgorithm,
  FlatCoordinate,
  GlobeAlgorithm,
  GlobeCoordinate,
  OutputUnit,
  ProjectionMode,
  algorithmMessageKey,
  buildFlatCircle,
  buildGeodesicCircle,
  buildGreatCirclePath,
  calculateFlatDistanceUnits,
  calculateGlobeDistanceMeters,
  flatAlgorithms,
  flatMidpoint,
  formatFlatCoordinate,
  formatGlobeCoordinate,
  formatNumber,
  fromMeters,
  geographicMidpoint,
  globeAlgorithms,
  initialBearingDegrees,
  parseFlatCoordinate,
  parseGlobeCoordinate,
  planarBearingDegrees,
  toMeters
} from "@/lib/geo";
import { CoordinateVisualizer } from "@/components/CoordinateVisualizer";
import {
  detectCoordinateProvider,
  getProviderMessageKey,
  type CoordinateProviderId
} from "@/lib/coordinate-providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabelWithTooltip } from "@/components/ui/label-with-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Check, Copy, Info, Link2, Maximize2, Minimize2 } from "lucide-react";

interface CoordinateToolProps {
  dict: Dictionary;
}

const algorithmColors: Record<AlgorithmId, string> = {
  haversine: "hsl(221, 83%, 45%)",
  vincenty: "hsl(160, 60%, 35%)",
  equirect: "hsl(30, 50%, 40%)",
  euclidean2d: "hsl(221, 83%, 45%)",
  euclidean3d: "hsl(260, 55%, 45%)",
  manhattan2d: "hsl(30, 50%, 40%)"
};

const outputUnitLabels: Record<OutputUnit, string> = {
  m: "Meters",
  km: "Kilometers",
  mi: "Miles",
  nmi: "Nautical miles",
  ft: "Feet",
  blocks: "Blocks",
};

const algoTooltipKeys: Record<AlgorithmId, string> = {
  haversine: "tooltipAlgoHaversine",
  vincenty: "tooltipAlgoVincenty",
  equirect: "tooltipAlgoEquirect",
  euclidean2d: "tooltipAlgoEuclidean2D",
  euclidean3d: "tooltipAlgoEuclidean3D",
  manhattan2d: "tooltipAlgoManhattan",
};

function parseMode(value: string | null): CoordinateMode {
  return value === "flat" ? "flat" : "globe";
}

function parseProjection(value: string | null): ProjectionMode {
  return value === "globe" ? "globe" : "map";
}

function parseOutputUnit(value: string | null): OutputUnit {
  const units: OutputUnit[] = ["m", "km", "mi", "nmi", "ft", "blocks"];
  return units.includes(value as OutputUnit) ? (value as OutputUnit) : "km";
}

function parseAlgorithmList(value: string | null, mode: CoordinateMode): AlgorithmId[] {
  const requested = (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as AlgorithmId[];

  const allowed = mode === "globe" ? globeAlgorithms : flatAlgorithms;
  const filtered = requested.filter((algorithm) => allowed.includes(algorithm as never));
  return filtered.length ? filtered : [allowed[0]];
}

export function CoordinateTool({ dict }: CoordinateToolProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [mode, setMode] = useState<CoordinateMode>(() => parseMode(searchParams.get("mode")));
  const [projection, setProjection] = useState<ProjectionMode>(() => parseProjection(searchParams.get("projection")));
  const [pointAInput, setPointAInput] = useState<string>(() =>
    searchParams.get("a") ?? "37.4219999, -122.0840575"
  );
  const [pointBInput, setPointBInput] = useState<string>(() => searchParams.get("b") ?? "40.7128, -74.0060");
  const [centerInput, setCenterInput] = useState<string>(() => searchParams.get("center") ?? "");
  const [radiusValue, setRadiusValue] = useState<string>(() => searchParams.get("radius") ?? "0");
  const [outputUnit, setOutputUnit] = useState<OutputUnit>(() => parseOutputUnit(searchParams.get("unit")));
  const [flatScaleMeters, setFlatScaleMeters] = useState<number>(() => {
    const parsed = Number(searchParams.get("scale") ?? "1");
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<AlgorithmId[]>(() =>
    parseAlgorithmList(searchParams.get("algos"), parseMode(searchParams.get("mode")))
  );
  const [copied, setCopied] = useState(false);
  const [copiedResultKey, setCopiedResultKey] = useState<string | null>(null);
  const [detectedProviderA, setDetectedProviderA] = useState<CoordinateProviderId | null>(null);
  const [detectedProviderB, setDetectedProviderB] = useState<CoordinateProviderId | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [zoomToPoint, setZoomToPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [zoomFitBoth, setZoomFitBoth] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onFullscreenChange = () => setIsMapFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleMapFullscreen = async () => {
    const el = mapContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen();
    }
  };

  useEffect(() => {
    const allowed = mode === "globe" ? globeAlgorithms : flatAlgorithms;
    setSelectedAlgorithms((previous) => {
      const filtered = previous.filter((algorithm) => allowed.includes(algorithm as never));
      return filtered.length ? filtered : [allowed[0]];
    });
    if (mode === "flat") {
      setProjection("map");
    }
  }, [mode]);

  const pointAParsed = useMemo(
    () => (mode === "globe" ? parseGlobeCoordinate(pointAInput) : parseFlatCoordinate(pointAInput)),
    [mode, pointAInput]
  );
  const pointBParsed = useMemo(
    () => (mode === "globe" ? parseGlobeCoordinate(pointBInput) : parseFlatCoordinate(pointBInput)),
    [mode, pointBInput]
  );
  const centerParsed = useMemo(() => {
    if (!centerInput.trim()) return null;
    return mode === "globe" ? parseGlobeCoordinate(centerInput) : parseFlatCoordinate(centerInput);
  }, [mode, centerInput]);

  const radiusNumeric = Number(radiusValue);
  const radiusMeters = Number.isFinite(radiusNumeric) && radiusNumeric > 0 ? toMeters(radiusNumeric, outputUnit) : 0;

  const distances = useMemo(() => {
    if (!pointAParsed.ok || !pointBParsed.ok) return [];

    if (mode === "globe") {
      const a = pointAParsed.value as GlobeCoordinate;
      const b = pointBParsed.value as GlobeCoordinate;

      return selectedAlgorithms.map((algorithm) => {
        const meters = calculateGlobeDistanceMeters(algorithm as GlobeAlgorithm, a, b);
        return {
          algorithm,
          meters,
          displayValue: fromMeters(meters, outputUnit)
        };
      });
    }

    const a = pointAParsed.value as FlatCoordinate;
    const b = pointBParsed.value as FlatCoordinate;

    return selectedAlgorithms.map((algorithm) => {
      const units = calculateFlatDistanceUnits(algorithm as FlatAlgorithm, a, b);
      const meters = units * flatScaleMeters;
      return {
        algorithm,
        meters,
        displayValue: fromMeters(meters, outputUnit)
      };
    });
  }, [flatScaleMeters, mode, outputUnit, pointAParsed, pointBParsed, selectedAlgorithms]);

  const midpointText = useMemo(() => {
    if (!pointAParsed.ok || !pointBParsed.ok) return null;
    if (mode === "globe") {
      return formatGlobeCoordinate(geographicMidpoint(pointAParsed.value as GlobeCoordinate, pointBParsed.value as GlobeCoordinate));
    }
    return formatFlatCoordinate(flatMidpoint(pointAParsed.value as FlatCoordinate, pointBParsed.value as FlatCoordinate));
  }, [mode, pointAParsed, pointBParsed]);

  const bearingText = useMemo(() => {
    if (!pointAParsed.ok || !pointBParsed.ok) return null;
    const degrees =
      mode === "globe"
        ? initialBearingDegrees(pointAParsed.value as GlobeCoordinate, pointBParsed.value as GlobeCoordinate)
        : planarBearingDegrees(pointAParsed.value as FlatCoordinate, pointBParsed.value as FlatCoordinate);
    return `${formatNumber(degrees)}°`;
  }, [mode, pointAParsed, pointBParsed]);

  const algorithmPaths = useMemo(() => {
    if (!pointAParsed.ok || !pointBParsed.ok) return [];

    if (mode === "globe") {
      const a = pointAParsed.value as GlobeCoordinate;
      const b = pointBParsed.value as GlobeCoordinate;

      return selectedAlgorithms.map((algorithm) => ({
        id: algorithm,
        color: algorithmColors[algorithm],
        globePath:
          algorithm === "equirect"
            ? [a, b]
            : buildGreatCirclePath(a, b)
      }));
    }

    const a = pointAParsed.value as FlatCoordinate;
    const b = pointBParsed.value as FlatCoordinate;

    return selectedAlgorithms.map((algorithm) => {
      const midpoint = { x: b.x, y: a.y, z: a.z };
      return {
        id: algorithm,
        color: algorithmColors[algorithm],
        flatPath: algorithm === "manhattan2d" ? [a, midpoint, b] : [a, b]
      };
    });
  }, [mode, pointAParsed, pointBParsed, selectedAlgorithms]);

  const radiusGlobePath = useMemo(() => {
    if (mode !== "globe") return undefined;
    if (!centerParsed?.ok || radiusMeters <= 0) return undefined;
    return buildGeodesicCircle(centerParsed.value as GlobeCoordinate, radiusMeters);
  }, [centerParsed, mode, radiusMeters]);

  const radiusFlatPath = useMemo(() => {
    if (mode !== "flat") return undefined;
    if (!centerParsed?.ok || radiusMeters <= 0) return undefined;
    const radiusInUnits = radiusMeters / flatScaleMeters;
    return buildFlatCircle(centerParsed.value as FlatCoordinate, radiusInUnits);
  }, [centerParsed, flatScaleMeters, mode, radiusMeters]);

  const shareQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("projection", projection);
    params.set("a", pointAInput);
    params.set("b", pointBInput);
    params.set("algos", selectedAlgorithms.join(","));
    params.set("unit", outputUnit);
    params.set("scale", String(flatScaleMeters));

    if (centerInput.trim()) params.set("center", centerInput);
    if (radiusValue.trim()) params.set("radius", radiusValue);

    return params.toString();
  }, [centerInput, flatScaleMeters, mode, outputUnit, pointAInput, pointBInput, projection, radiusValue, selectedAlgorithms]);

  const sharePath = `${pathname}?${shareQuery}`;

  const toggleAlgorithm = (algorithm: AlgorithmId) => {
    const allowed = mode === "globe" ? globeAlgorithms : flatAlgorithms;
    if (!allowed.includes(algorithm as never)) return;

    setSelectedAlgorithms((previous) => {
      if (previous.includes(algorithm)) {
        if (previous.length === 1) return previous;
        return previous.filter((item) => item !== algorithm);
      }
      return [...previous, algorithm];
    });
  };

  const copyLink = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}${sharePath}` : sharePath;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.history.replaceState({}, "", sharePath);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const allowedAlgorithms = mode === "globe" ? globeAlgorithms : flatAlgorithms;

  const sortedDistances = useMemo(() => {
    return [...distances].sort((a, b) => a.meters - b.meters);
  }, [distances]);

  const minMeters = distances.length ? Math.min(...distances.map((d) => d.meters)) : 0;
  const maxMeters = distances.length ? Math.max(...distances.map((d) => d.meters)) : 0;
  const hasRange = distances.length > 1 && maxMeters > minMeters;

  const resultsCopyText = useMemo(() => {
    if (!distances.length) return "";
    const lines = distances.map(
      (row) =>
        `${t(dict, algorithmMessageKey[row.algorithm] as never)}: ${formatNumber(row.displayValue)} ${outputUnitLabels[outputUnit]}`
    );
    if (midpointText) lines.push(`${t(dict, "midpointLabel")}: ${midpointText}`);
    if (bearingText) lines.push(`${t(dict, "bearingLabel")}: ${bearingText}`);
    return lines.join("\n");
  }, [dict, distances, midpointText, bearingText, outputUnit, outputUnitLabels]);

  const copyResults = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedResultKey(key);
      window.setTimeout(() => setCopiedResultKey(null), 1500);
    } catch {
      setCopiedResultKey(null);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-8">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-2 pb-4">
            <CardTitle className="font-serif text-xl tracking-tight sm:text-2xl">
              {t(dict, "heroTitle")}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {t(dict, "heroSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <LabelWithTooltip
                label={t(dict, "modeLabel")}
                tooltip={t(dict, "tooltipMode")}
              />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant={mode === "globe" ? "default" : "outline"}
                size="sm"
                className="w-full sm:flex-1"
                onClick={() => setMode("globe")}
              >
                {t(dict, "modeGlobe")}
              </Button>
              <Button
                type="button"
                variant={mode === "flat" ? "default" : "outline"}
                size="sm"
                className="w-full sm:flex-1"
                onClick={() => setMode("flat")}
              >
                {t(dict, "modeFlat")}
              </Button>
            </div>
          </div>

          {mode === "globe" ? (
            <div className="space-y-2">
              <LabelWithTooltip
                label={t(dict, "projectionLabel")}
                tooltip={t(dict, "tooltipProjection")}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant={projection === "map" ? "default" : "outline"}
                  size="sm"
                  className="w-full sm:flex-1"
                  onClick={() => setProjection("map")}
                >
                  {t(dict, "projectionMap")}
                </Button>
                <Button
                  type="button"
                  variant={projection === "globe" ? "default" : "outline"}
                  size="sm"
                  className="w-full sm:flex-1"
                  onClick={() => setProjection("globe")}
                >
                  {t(dict, "projectionGlobe")}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <LabelWithTooltip
              htmlFor="point-a"
              label={t(dict, "pointALabel")}
              tooltip={t(dict, "tooltipPointA")}
            />
            <Textarea
              id="point-a"
              rows={2}
              value={pointAInput}
              onChange={(e) => {
                setPointAInput(e.target.value);
                setDetectedProviderA(null);
              }}
              onPaste={(e) => {
                const pasted = e.clipboardData?.getData("text/plain");
                if (pasted) {
                  const provider = detectCoordinateProvider(pasted);
                  if (provider) setDetectedProviderA(provider);
                }
              }}
              placeholder={mode === "globe" ? t(dict, "placeholderGlobe") : t(dict, "placeholderFlat")}
              className="resize-y"
            />
            {detectedProviderA ? (
              <p className="text-xs text-muted-foreground">
                {t(dict, "detectedFromLabel")} {t(dict, getProviderMessageKey(detectedProviderA))}
              </p>
            ) : null}
            {!pointAParsed.ok ? (
              <p className="text-xs text-destructive">{t(dict, "invalidInput")}</p>
            ) : null}
            {pointAParsed.ok ? (
              <p className="text-xs text-muted-foreground font-mono">
                {t(dict, "parsedUsedLabel")}:{" "}
                {mode === "globe"
                  ? `${t(dict, "latitudeLabel")} ${(pointAParsed.value as GlobeCoordinate).lat.toFixed(6)}°, ${t(dict, "longitudeLabel")} ${(pointAParsed.value as GlobeCoordinate).lon.toFixed(6)}°`
                  : `x ${(pointAParsed.value as FlatCoordinate).x.toFixed(3)}, y ${(pointAParsed.value as FlatCoordinate).y.toFixed(3)}, z ${(pointAParsed.value as FlatCoordinate).z.toFixed(3)}`}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <LabelWithTooltip
              htmlFor="point-b"
              label={t(dict, "pointBLabel")}
              tooltip={t(dict, "tooltipPointB")}
            />
            <Textarea
              id="point-b"
              rows={2}
              value={pointBInput}
              onChange={(e) => {
                setPointBInput(e.target.value);
                setDetectedProviderB(null);
              }}
              onPaste={(e) => {
                const pasted = e.clipboardData?.getData("text/plain");
                if (pasted) {
                  const provider = detectCoordinateProvider(pasted);
                  if (provider) setDetectedProviderB(provider);
                }
              }}
              placeholder={mode === "globe" ? t(dict, "placeholderGlobe") : t(dict, "placeholderFlat")}
              className="resize-y"
            />
            {detectedProviderB ? (
              <p className="text-xs text-muted-foreground">
                {t(dict, "detectedFromLabel")} {t(dict, getProviderMessageKey(detectedProviderB))}
              </p>
            ) : null}
            {!pointBParsed.ok ? (
              <p className="text-xs text-destructive">{t(dict, "invalidInput")}</p>
            ) : null}
            {pointBParsed.ok ? (
              <p className="text-xs text-muted-foreground font-mono">
                {t(dict, "parsedUsedLabel")}:{" "}
                {mode === "globe"
                  ? `${t(dict, "latitudeLabel")} ${(pointBParsed.value as GlobeCoordinate).lat.toFixed(6)}°, ${t(dict, "longitudeLabel")} ${(pointBParsed.value as GlobeCoordinate).lon.toFixed(6)}°`
                  : `x ${(pointBParsed.value as FlatCoordinate).x.toFixed(3)}, y ${(pointBParsed.value as FlatCoordinate).y.toFixed(3)}, z ${(pointBParsed.value as FlatCoordinate).z.toFixed(3)}`}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <LabelWithTooltip
              label={t(dict, "algorithmsLabel")}
              tooltip={t(dict, "tooltipAlgorithms")}
            />
            <div className="flex flex-col gap-2">
              {allowedAlgorithms.map((algorithm) => (
                <div key={algorithm} className="flex items-center gap-2">
                  <Checkbox
                    id={`algo-${algorithm}`}
                    checked={selectedAlgorithms.includes(algorithm)}
                    onCheckedChange={() => toggleAlgorithm(algorithm)}
                  />
                  <label
                    htmlFor={`algo-${algorithm}`}
                    className="flex flex-1 cursor-pointer items-center gap-1.5 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    <span>{t(dict, algorithmMessageKey[algorithm] as never)}</span>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex size-4 shrink-0 rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          aria-label="Algorithm info"
                          onClick={(e) => e.preventDefault()}
                        >
                          <Info className="size-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-left">
                        {t(dict, algoTooltipKeys[algorithm] as never)}
                      </TooltipContent>
                    </Tooltip>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <LabelWithTooltip
                htmlFor="center"
                label={t(dict, "centerLabel")}
                tooltip={t(dict, "tooltipCenter")}
              />
              <Input
                id="center"
                type="text"
                value={centerInput}
                onChange={(e) => setCenterInput(e.target.value)}
                placeholder={mode === "globe" ? t(dict, "placeholderGlobe") : t(dict, "placeholderFlat")}
              />
              {centerInput.trim() && !centerParsed?.ok ? (
                <p className="text-xs text-destructive">{t(dict, "invalidInput")}</p>
              ) : null}
              {centerParsed?.ok ? (
                <p className="text-xs text-muted-foreground font-mono">
                  {t(dict, "parsedUsedLabel")}:{" "}
                  {mode === "globe"
                    ? `${t(dict, "latitudeLabel")} ${(centerParsed.value as GlobeCoordinate).lat.toFixed(6)}°, ${t(dict, "longitudeLabel")} ${(centerParsed.value as GlobeCoordinate).lon.toFixed(6)}°`
                    : `x ${(centerParsed.value as FlatCoordinate).x.toFixed(3)}, y ${(centerParsed.value as FlatCoordinate).y.toFixed(3)}, z ${(centerParsed.value as FlatCoordinate).z.toFixed(3)}`}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <LabelWithTooltip
                htmlFor="radius"
                label={t(dict, "radiusLabel")}
                tooltip={t(dict, "tooltipRadius")}
              />
              <Input
                id="radius"
                type="number"
                min={0}
                step="any"
                value={radiusValue}
                onChange={(e) => setRadiusValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t(dict, "radiusHint")}</p>
            </div>
          </div>

          <div className="space-y-2">
            <LabelWithTooltip
              htmlFor="output-unit"
              label={t(dict, "outputUnitLabel")}
              tooltip={t(dict, "tooltipOutputUnit")}
            />
            <Select value={outputUnit} onValueChange={(v) => setOutputUnit(v as OutputUnit)}>
              <SelectTrigger id="output-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(outputUnitLabels) as OutputUnit[]).map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {outputUnitLabels[unit]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "flat" ? (
            <div className="space-y-2">
              <LabelWithTooltip
                htmlFor="scale"
                label={t(dict, "scaleLabel")}
                tooltip={t(dict, "tooltipScale")}
              />
              <Input
                id="scale"
                type="number"
                min={0.000001}
                step="any"
                value={flatScaleMeters}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (Number.isFinite(next) && next > 0) setFlatScaleMeters(next);
                }}
              />
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">{t(dict, "parsingHint")}</p>

          <div className="space-y-2 rounded-xl border border-border/80 bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 gap-2 sm:flex-initial"
                onClick={copyLink}
              >
                {copied ? (
                  <>
                    <Copy className="size-4" />
                    {t(dict, "copied")}
                  </>
                ) : (
                  <>
                    <Link2 className="size-4" />
                    {t(dict, "copyLink")}
                  </>
                )}
              </Button>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-label="More info"
                  >
                    <Info className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-left">
                  {t(dict, "tooltipCopyLink")}
                </TooltipContent>
              </Tooltip>
            </div>
            <code className="block overflow-x-auto rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {sharePath}
            </code>
          </div>
        </CardContent>
      </Card>

      <Card className="flex flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col min-h-0 p-4 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <a
              href="mailto:lukasdzn1@gmail.com?subject=Coordinate%20Distance%20Calculator%20%E2%80%94%20Issue%20or%20feature%20suggestion"
              className="text-muted-foreground underline decoration-muted-foreground/50 underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground/50"
            >
              {t(dict, "reportIssueLabel")}
            </a>
            <span className="text-muted-foreground/60" aria-hidden>
              ·
            </span>
            <a
              href="https://buymeacoffee.com/lukasdzn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground underline decoration-muted-foreground/50 underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground/50"
            >
              {t(dict, "buyMeACoffeeLabel")}
            </a>
          </div>
          <div
            ref={mapContainerRef}
            className="relative w-full overflow-hidden rounded-xl border border-border/80 bg-muted/20 aspect-[16/9] min-h-[240px] sm:min-h-[320px]"
          >
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="absolute bottom-3 left-3 z-10 flex cursor-help items-center gap-1.5 rounded-lg bg-foreground/70 px-2.5 py-1.5 text-xs text-primary-foreground shadow-sm backdrop-blur-sm hover:bg-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary-foreground/40"
                  aria-label="Map controls hint"
                >
                  Scroll to zoom · Drag to pan
                  <Info className="size-3 opacity-90" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-left">
                {t(dict, "tooltipMapHint")}
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleMapFullscreen}
                  className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-lg bg-foreground/70 px-2.5 py-1.5 text-xs text-primary-foreground shadow-sm backdrop-blur-sm hover:bg-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary-foreground/40"
                  aria-label={isMapFullscreen ? t(dict, "exitFullscreenLabel") : t(dict, "expandMapLabel")}
                >
                  {isMapFullscreen ? (
                    <Minimize2 className="size-3.5" aria-hidden />
                  ) : (
                    <Maximize2 className="size-3.5" aria-hidden />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-left">
                {isMapFullscreen ? t(dict, "exitFullscreenLabel") : t(dict, "expandMapLabel")}
              </TooltipContent>
            </Tooltip>
            <CoordinateVisualizer
              mode={mode}
              projection={projection}
              pointA={pointAParsed.ok ? pointAParsed.value : undefined}
              pointB={pointBParsed.ok ? pointBParsed.value : undefined}
              centerPoint={centerParsed?.ok ? centerParsed.value : undefined}
              radiusGlobePath={radiusGlobePath}
              radiusFlatPath={radiusFlatPath}
              algorithmPaths={algorithmPaths}
              zoomToPoint={zoomToPoint}
              zoomFitBoth={zoomFitBoth}
              onZoomComplete={() => {
                setZoomToPoint(null);
                setZoomFitBoth(false);
              }}
            />
          </div>

          {mode === "globe" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!pointAParsed.ok}
                onClick={() =>
                  pointAParsed.ok && "lat" in pointAParsed.value &&
                  setZoomToPoint({ lat: pointAParsed.value.lat, lon: pointAParsed.value.lon })
                }
              >
                {t(dict, "zoomToPointALabel")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!pointBParsed.ok}
                onClick={() =>
                  pointBParsed.ok && "lat" in pointBParsed.value &&
                  setZoomToPoint({ lat: pointBParsed.value.lat, lon: pointBParsed.value.lon })
                }
              >
                {t(dict, "zoomToPointBLabel")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!pointAParsed.ok || !pointBParsed.ok}
                onClick={() => setZoomFitBoth(true)}
              >
                {t(dict, "zoomOutLabel")}
              </Button>
            </div>
          )}

          <article className="mt-4 rounded-xl border border-border/80 bg-card/50 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
                  {t(dict, "resultsTitle")}
                </h2>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex size-4 shrink-0 rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      aria-label="More info"
                    >
                      <Info className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-left">
                    {t(dict, "tooltipResults")}
                  </TooltipContent>
                </Tooltip>
              </div>
              {distances.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => copyResults(resultsCopyText, "all")}
                >
                  {copiedResultKey === "all" ? (
                    <>
                      <Check className="size-3.5" />
                      {t(dict, "copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      {t(dict, "copyResults")}
                    </>
                  )}
                </Button>
              )}
            </div>

            {distances.length ? (
              <div className="mt-4">
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 px-1 sm:px-2" role="table" aria-label="Distance results">
                  <span className="col-span-2 text-xs font-medium uppercase tracking-wider text-muted-foreground" role="columnheader">
                    Algorithm
                  </span>
                  <span className="text-right text-xs font-medium uppercase tracking-wider text-muted-foreground" role="columnheader">
                    Distance
                  </span>
                  <span className="w-9" role="columnheader" aria-hidden />
                </div>
                <ul className="mt-0.5 space-y-0.5" role="rowgroup">
                  {sortedDistances.map((row) => {
                    const lineText = `${t(dict, algorithmMessageKey[row.algorithm] as never)}: ${formatNumber(row.displayValue)} ${outputUnitLabels[outputUnit]}`;
                    const isShortest = hasRange && row.meters <= minMeters;
                    const isLongest = hasRange && row.meters >= maxMeters;
                    return (
                      <li
                        key={row.algorithm}
                        className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-lg py-2 pl-1 pr-1 sm:py-2.5 sm:pl-2 sm:pr-2 hover:bg-muted/40 transition-colors"
                        role="row"
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full sm:size-3"
                          style={{ backgroundColor: algorithmColors[row.algorithm] }}
                          aria-hidden
                          title={t(dict, algorithmMessageKey[row.algorithm] as never)}
                        />
                        <span className="min-w-0 text-sm text-foreground">
                          {t(dict, algorithmMessageKey[row.algorithm] as never)}
                          {(isShortest || isLongest) && (
                            <span className="ml-1.5 inline-block text-xs font-medium text-muted-foreground">
                              {isShortest && "· shortest"}
                              {isLongest && !isShortest && "· longest"}
                            </span>
                          )}
                        </span>
                        <span className="text-right tabular-nums whitespace-nowrap">
                          <span className="font-semibold text-foreground">{formatNumber(row.displayValue)}</span>
                          <span className="ml-1 text-sm text-muted-foreground">{outputUnitLabels[outputUnit]}</span>
                        </span>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                              aria-label="Copy this result"
                              onClick={() => copyResults(lineText, row.algorithm)}
                            >
                              {copiedResultKey === row.algorithm ? (
                                <Check className="size-4 text-green-600" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            {copiedResultKey === row.algorithm
                              ? t(dict, "copied")
                              : t(dict, "copyThisLine")}
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">{t(dict, "noResult")}</p>
            )}

            {(midpointText || bearingText) && (
              <div className="mt-5 border-t border-border/80 pt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                  {t(dict, "resultsDetails")}
                </p>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {midpointText ? (
                    <div>
                      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                        {t(dict, "midpointLabel")}
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex size-3.5 shrink-0 rounded-full text-muted-foreground hover:text-foreground focus:outline-none"
                              aria-label="More info"
                            >
                              <Info className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-left">
                            {t(dict, "tooltipMidpoint")}
                          </TooltipContent>
                        </Tooltip>
                      </dt>
                      <dd className="font-mono text-sm text-foreground break-all">{midpointText}</dd>
                    </div>
                  ) : null}
                  {bearingText ? (
                    <div>
                      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                        {t(dict, "bearingLabel")}
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex size-3.5 shrink-0 rounded-full text-muted-foreground hover:text-foreground focus:outline-none"
                              aria-label="More info"
                            >
                              <Info className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-left">
                            {t(dict, "tooltipBearing")}
                          </TooltipContent>
                        </Tooltip>
                      </dt>
                      <dd className="font-mono text-sm text-foreground tabular-nums">{bearingText}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            )}
          </article>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
