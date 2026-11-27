/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure source maps are excluded from client bundle serving in production (#761)
  productionBrowserSourceMaps: false,
};

export default nextConfig;
