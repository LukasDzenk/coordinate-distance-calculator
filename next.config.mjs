import { withPlausibleProxy } from "next-plausible";

const plausibleScriptUrl =
  process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL ?? "https://plausible-1.matcha-squad.xyz";

// Locale-prefixed proxy path so /en/proxy/api/event (etc.) skips locale routing and hits Plausible
const LOCALES =
  "en|es|fr|de|it|pt|nl|pl|tr|ru|ar|hi|zh|ja|ko|id|vi|th|uk|cs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  async rewrites() {
    return {
      afterFiles: [
        {
          source: `/:locale(${LOCALES})/proxy/api/event`,
          destination: `${plausibleScriptUrl}/api/event`,
        },
      ],
    };
  },
};

const nextConfigWithPlausible = withPlausibleProxy({
  customDomain: plausibleScriptUrl
});

export default nextConfigWithPlausible(nextConfig);
