/**
 * Detects which map/location provider a pasted string likely came from.
 * Used to show a "Detected from: Google Maps" style note below the input.
 */

export type CoordinateProviderId =
  | "google_maps"
  | "apple_maps"
  | "openstreetmap"
  | "bing_maps"
  | "here_wego"
  | "waze"
  | "yandex_maps"
  | "mapy_cz"
  | "baidu_maps"
  | "geo_uri"
  | "what3words"
  | "mapbox"
  | "copied_link";

const PROVIDER_PATTERNS: { id: CoordinateProviderId; pattern: RegExp }[] = [
  { id: "google_maps", pattern: /(?:maps\.google\.|google\.(?:com\/maps|co\.\w+\/maps)|goo\.gl\/maps)/i },
  { id: "apple_maps", pattern: /maps\.apple\.com/i },
  { id: "openstreetmap", pattern: /(?:openstreetmap\.org|osm\.org|www\.osm\.org)/i },
  { id: "bing_maps", pattern: /bing\.com\/maps/i },
  { id: "here_wego", pattern: /(?:here\.com|wego\.here\.com|wego\.here\.net)/i },
  { id: "waze", pattern: /waze\.com/i },
  { id: "yandex_maps", pattern: /yandex\.(?:com|ru)\/maps/i },
  { id: "mapy_cz", pattern: /mapy\.cz/i },
  { id: "baidu_maps", pattern: /(?:baidu\.com\/maps|map\.baidu\.com)/i },
  { id: "what3words", pattern: /what3words\.com/i },
  { id: "mapbox", pattern: /mapbox\.com/i }
];

/**
 * Returns the provider id if the pasted text looks like a URL or format from a known provider.
 * Call this with the pasted (or current) input to show a "Detected from: X" note.
 */
export function detectCoordinateProvider(raw: string): CoordinateProviderId | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // geo: URI (RFC 5878) – used by many apps and OpenStreetMap
  if (/^geo:\s*-?\d/i.test(trimmed)) {
    return "geo_uri";
  }

  // Plain URL (with or without protocol)
  let urlString = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    urlString = "https://" + trimmed;
  }

  try {
    const url = new URL(urlString);
    const fullUrl = url.href;

    for (const { id, pattern } of PROVIDER_PATTERNS) {
      if (pattern.test(fullUrl) || pattern.test(url.hostname)) {
        return id;
      }
    }

    // URL with @lat,lon (Google-style) or q= / ll= coords – treat as generic link if we didn't match above
    if (/\@-?\d[\d.]*,-?[\d.]+/.test(fullUrl) || url.searchParams.has("q") || url.searchParams.has("ll")) {
      return "copied_link";
    }
  } catch {
    // Not a valid URL
  }

  return null;
}

/**
 * Maps provider id to the i18n dictionary key (e.g. providerGoogleMaps).
 */
export function getProviderMessageKey(id: CoordinateProviderId): string {
  const key = id
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
  return "provider" + key;
}
