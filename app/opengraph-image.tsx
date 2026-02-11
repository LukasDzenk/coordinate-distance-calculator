import { ImageResponse } from "next/og";

export const alt = "Coordinate Distance Calculator — Map, Globe, GPS & XY";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, hsl(42 33% 98%) 0%, hsl(42 25% 94%) 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="16" cy="16" r="14" stroke="hsl(218 32% 35%)" strokeWidth="2" />
            <circle cx="10" cy="14" r="2.5" fill="hsl(218 32% 22%)" />
            <circle cx="22" cy="18" r="2.5" fill="hsl(160 45% 32%)" />
            <path
              d="M12.2 14.8 L19.8 17.2"
              stroke="hsl(218 32% 35%)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "hsl(28 18% 18%)",
            margin: 0,
            textAlign: "center",
            maxWidth: "90%",
          }}
        >
          Coordinate Distance Calculator
        </h1>
        <p
          style={{
            fontSize: 28,
            color: "hsl(28 12% 48%)",
            marginTop: 16,
            textAlign: "center",
            maxWidth: "85%",
          }}
        >
          Map, globe, GPS & XY — Haversine, Vincenty, units, midpoint & bearing
        </p>
      </div>
    ),
    { ...size }
  );
}
