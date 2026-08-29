import { createClient } from '@supabase/supabase-js'

// Mengambil variabel lingkungan dari .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validasi untuk memastikan variabel env sudah terisi
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Next_Public Supabase URL or Anon Key')
}

// Inisialisasi klien Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)