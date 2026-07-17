/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@bennyblader/ddk-ts'],
  // ddk-ts wasm (wasm32-wasip1-threads) needs SharedArrayBuffer -> cross-origin isolation
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
  webpack: (config, { isServer, webpack }) => {
    config.experiments = { ...config.experiments, topLevelAwait: true, asyncWebAssembly: true };
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
      };
      config.plugins.push(new webpack.ProvidePlugin({ Buffer: ['buffer', 'Buffer'] }));
    }
    return config;
  },
};

export default nextConfig;
