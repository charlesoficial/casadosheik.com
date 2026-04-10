const remotePatterns = [{ protocol: "https", hostname: "images.unsplash.com" }];

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const supabaseHostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
    remotePatterns.push({ protocol: "https", hostname: supabaseHostname });
  } catch {
    // Ignora URL invalida para nao bloquear o build local.
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // The local Windows dev environment has been intermittently corrupting
      // webpack's filesystem cache and breaking chunk resolution. Disabling
      // the cache in dev keeps hot reload slower but much more stable.
      config.cache = false;
    }

    return config;
  }
};

export default nextConfig;
