/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@neondatabase/serverless'],
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    MAILERLITE_API_KEY: process.env.MAILERLITE_API_KEY,
    SESSION_SECRET: process.env.SESSION_SECRET || 'your-secret-key-change-in-production'
  }
}

export default nextConfig