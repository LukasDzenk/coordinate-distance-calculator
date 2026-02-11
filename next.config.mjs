import { withPlausibleProxy } from "next-plausible";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true
};

const plausibleScriptUrl =
  process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL ?? "https://plausible-1.matcha-squad.xyz";

const nextConfigWithPlausible = withPlausibleProxy({
  customDomain: plausibleScriptUrl
});

export default nextConfigWithPlausible(nextConfig);
