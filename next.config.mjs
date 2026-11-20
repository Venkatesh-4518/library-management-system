/** @type {import('next').NextConfig} */
const nextConfig = {
  // Database drivers run only on the server and are loaded from node_modules
  serverExternalPackages: ['mysql2', 'mongodb'],
};

export default nextConfig;
