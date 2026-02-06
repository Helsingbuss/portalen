/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "login.helsingbuss.se" },
      { protocol: "https", hostname: "boka.helsingbuss.se" },
      { protocol: "https", hostname: "meotcdztoehulrirqzxn.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  async rewrites() {
    // Viktigt: tom array – inga rewrites
    return [];
  },

  async headers() {
    return [
      {
        source: "/widget/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          {
            key: "Cache-Control",
            value:
              "public, max-age=60, s-maxage=600, stale-while-revalidate=1200",
          },
        ],
      },
    ];
  },

  // NYTT: redirect för invest.helsingbuss.se -> /invest
  async redirects() {
    return [
      {
        source: "/",
        has: [
          {
            // Kolla Host-headern så det bara gäller invest.helsingbuss.se
            type: "header",
            key: "host",
            value: "invest.helsingbuss.se",
          },
        ],
        destination: "/invest",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
