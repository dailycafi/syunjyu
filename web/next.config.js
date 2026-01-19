const path = require('path')
const { loadEnvConfig } = require('@next/env')

// Load environment variables from project root .env files
// This allows sharing config between backend and frontend
const projectRoot = path.resolve(__dirname, '..')
loadEnvConfig(projectRoot)

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,  // Enable static export for Tauri only in production
  images: {
    unoptimized: true,
  },
  // Disable server-side features for Tauri compatibility
  // trailingSlash: true, // Not strictly necessary for dev mode
  turbopack: {
    root: __dirname, // Set the root directory for Turbopack to the web directory
  },
}

module.exports = nextConfig
