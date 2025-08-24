/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: false, // säkerställer att Next inte letar efter "app/"
  },
  pageExtensions: ["tsx", "ts", "jsx", "js"], // ser till att .tsx används
};

module.exports = nextConfig;
