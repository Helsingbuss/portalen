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

      // Lägg till dina egna källor vid behov – ofarligt om de inte används
      { protocol: 'https', hostname: 'login.helsingbuss.se' }, // egna uppladdningar via din domän
      { protocol: 'https', hostname: '*.supabase.co' },        // Supabase Storage (om du använder det)
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' } // t.ex. Google-avatarer (valfritt)
    ],
  },
};

module.exports = nextConfig;
