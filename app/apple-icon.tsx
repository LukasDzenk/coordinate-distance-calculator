import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, hsl(210 40% 98%) 0%, hsl(214 32% 94%) 100%)",
          borderRadius: 36,
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="16" cy="16" r="14" stroke="hsl(221 83% 53%)" strokeWidth="2" />
          <circle cx="10" cy="14" r="2.5" fill="hsl(221 83% 45%)" />
          <circle cx="22" cy="18" r="2.5" fill="hsl(160 55% 35%)" />
          <path
            d="M12.2 14.8 L19.8 17.2"
            stroke="hsl(221 83% 53%)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
