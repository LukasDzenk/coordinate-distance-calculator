import { withPlausibleProxy } from "next-plausible";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true
};

const nextConfigWithPlausible = withPlausibleProxy({
  customDomain: "https://plausible-1.matcha-squad.xyz"
});

export default nextConfigWithPlausible(nextConfig);
