/** @type {import('next').NextConfig} */
const nextConfig = {
  // Just transpile the crypto packages
  transpilePackages: ['@mysten/sui', '@mysten/zklogin'],
  
  // Remove the Webpack fallback logic entirely; let dynamic imports handle it
};

module.exports = nextConfig;