/** @type {import('next').NextConfig} */
// const nextConfig = {
  
//   allowedDevOrigins: ["localhost:3000", "sandbox.payfast.co.za", process.env.APP_URL]
// };

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["localhost:3000", "sandbox.payfast.co.za", process.env.APP_URL],
};


export default nextConfig;
