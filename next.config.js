/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse'],
  webpack: (config, { isServer }) => {
    // Add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      util: false,
      buffer: false,
    };

    // Handle PDF parsing on server side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pdf-parse');
    }

    return config;
  },
  // Disable static optimization for dynamic imports
  trailingSlash: false,
  poweredByHeader: false,
};

module.exports = nextConfig;
