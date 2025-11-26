/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,  // Enable static export for Tauri only in production
  images: {
    unoptimized: true,
  },
  // Disable server-side features for Tauri compatibility
  // trailingSlash: true, // Not strictly necessary for dev mode
}

module.exports = nextConfig
