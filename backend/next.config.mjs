/** @type {import('next').NextConfig} */

const ngrokUrl = process.env.APP_URL?.replace("http://", "")
  ?.replace("https://", "")
  ?.trim();
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["sandbox.payfast.co.za", ngrokUrl],
};

export default nextConfig;
