/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // For static export (compatible with Tauri)
  images: {
    unoptimized: true,  // Required for static export
  },
  // Disable server-side features for Tauri compatibility
  trailingSlash: true,
}

module.exports = nextConfig
