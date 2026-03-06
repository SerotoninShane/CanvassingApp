/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow MapLibre WebWorkers
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
};

module.exports = nextConfig;
