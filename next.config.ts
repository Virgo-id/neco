/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Mengizinkan semua domain eksternal (Supabase, Firebase, S3, dll)
      },
    ],
  },
}

module.exports = nextConfig