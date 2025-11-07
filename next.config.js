/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    // Lämna som det är om du inte använder appDir
    // appDir: true,
  },

  // ✅ Tillåt externa bildkällor för <Image />
  images: {
    remotePatterns: [
      // Demo/placeholder-bilder
      { protocol: 'https', hostname: 'images.unsplash.com' },

      // Dina domäner
      { protocol: 'https', hostname: 'login.helsingbuss.se' },
      { protocol: 'https', hostname: 'kund.helsingbuss.se' },

      // Supabase Storage (alla projekt)
      { protocol: 'https', hostname: '*.supabase.co' },

      // T.ex. Google-avatarer
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // ✅ Ersätter "middleware som proxy" → använd rewrites i stället
  async rewrites() {
    return [
      // Serva widget-skript och tillgångar via din app utan att ha egen route
      { source: '/widget/:path*', destination: 'https://login.helsingbuss.se/widget/:path*' },

      // Exempel (lämna avkommenterad om/ tills du behöver den):
      // Skicka /offert/* vidare till kund-domänen om du kör allt från samma deployment.
      // OBS: Om kund.helsingbuss.se är ett eget Vercel-projekt, länka direkt dit i mail i stället.
      // { source: '/offert/:path*', destination: 'https://kund.helsingbuss.se/offert/:path*' },
    ];
  },

  // ✅ Valfria headers för widget (CORS + cache)
  async headers() {
    return [
      {
        source: '/widget/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=600, stale-while-revalidate=1200' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
