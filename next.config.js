/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    MAILERLITE_API_KEY: process.env.MAILERLITE_API_KEY,
    SESSION_SECRET: process.env.SESSION_SECRET || 'your-secret-key-change-in-production'
  }
}

export default nextConfig