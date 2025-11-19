/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // INTE output:'export' – API-routes kräver server
  // output: undefined,

  experimental: {
    // Lämna av om du kör "pages/" (vilket du gör)
    // appDir: true,
  },

  images: {
    remotePatterns: [
      // Demo/placeholder
      { protocol: 'https', hostname: 'images.unsplash.com' },

      // Dina domäner
      { protocol: 'https', hostname: 'login.helsingbuss.se' },
      { protocol: 'https', hostname: 'kund.helsingbuss.se' },

      // Supabase Storage – exakt projekt
      { protocol: 'https', hostname: 'meotcdztoehulrirqzxn.supabase.co' },

      // (Fallback) – vissa Next-versioner stödjer wildcard så här.
      // Om builden klagar: ta bort denna rad och behåll den exakta ovan.
      { protocol: 'https', hostname: '**.supabase.co' },

      // Google-avatarer
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  async rewrites() {
    return [
      // Varning: Din app kör på login.helsingbuss.se
      // Att rewrita /widget/* -> https://login.helsingbuss.se/widget/* skapar loop.
      // Om du har ett EXTERNT widget-ursprung (CDN), peka dit här.
      // Exempel (aktivera när du har ett separat ursprung):
      // { source: '/widget/:path*', destination: 'https://cdn.helsingbuss.se/widget/:path*' },

      // Om /offert/* ska servas av kund-projektet (separerad deploy), kan du aktivera denna:
      // { source: '/offert/:path*', destination: 'https://kund.helsingbuss.se/offert/:path*' },
    ];
  },

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
