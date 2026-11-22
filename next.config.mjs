/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude source maps from public production bundles (Issue #761)
  productionBrowserSourceMaps: false,
};

export default nextConfig;
