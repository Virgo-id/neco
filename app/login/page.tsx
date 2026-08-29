'use client'

import { useState } from 'react'
import { supabase } from '../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const router = useRouter()

  // Fungsi Login Email
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      
      router.push('/')
      router.refresh()
    } catch (error: any) {
      setMessage({ 
        text: error.message || 'Terjadi kesalahan, silakan coba lagi.', 
        type: 'error' 
      })
    } finally {
      setLoading(false)
    }
  }

  // Fungsi Login dengan Google
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      })
      if (error) throw error
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' })
    }
  }

  return (
    <div className="min-h-screen bg-[#ffffff] flex flex-col font-sans antialiased">
      
      {/* HEADER - Murni #ffffff tanpa shadow dan border bawah tipis samar */}
      <header className="bg-[#ffffff] py-4 px-3 sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-black tracking-tight text-gray-950">
            Ne<span className="text-red-600">co</span>
          </Link>
          <span className="text-xs font-bold text-gray-400 hover:text-red-600 cursor-pointer transition-colors">
            Bantuan 24/7
          </span>
        </div>
      </header>

      {/* CONTAINER FORM - Flat tanpa shadow, bg murni, tanpa border luar yang tebal */}
      <main className="flex-grow flex items-center justify-center p-3 my-4">
        <div className="w-full max-w-md bg-[#ffffff] space-y-6">
          
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-950">
              Selamat Datang Kembali
            </h1>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Masuk untuk mulai menjelajahi promo spesial dan mengelola pesanan Anda di Neco.
            </p>
          </div>
          
          {/* NOTIFIKASI ERROR / SUKSES */}
          {message.text && (
            <div className={`p-3 rounded-lg text-xs font-bold transition-all ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800' 
                : 'bg-red-50 text-red-600'
            }`}>
              <div className="flex gap-2 items-start">
                <span className="text-sm leading-none">{message.type === 'success' ? '✓' : '⚠️'}</span>
                <p className="tracking-tight leading-relaxed flex-1">{message.text}</p>
              </div>
            </div>
          )}

          {/* INPUT FORM GROUP */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-3">
              
              {/* Field Email */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider px-0.5">
                  Alamat Email
                </label>
                <input
                  type="email"
                  required
                  className="w-full bg-gray-100 focus:bg-[#ffffff] rounded-lg px-3 py-2 text-xs font-medium text-black focus:outline-none placeholder-gray-400"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Field Kata Sandi */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider px-0.5">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  required
                  className="w-full bg-gray-100 focus:bg-[#ffffff] rounded-lg px-3 py-2 text-xs font-medium text-black focus:outline-none placeholder-gray-400"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

            </div>

            <div className="text-right px-0.5">
              <span className="text-[11px] text-gray-400 hover:text-red-600 font-bold cursor-pointer transition-colors">
                Lupa Kata Sandi?
              </span>
            </div>

            {/* TOMBOL AKSI UTAMA - Flat, tanpa shadow */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-bold text-xs transition-colors disabled:opacity-40 text-center"
            >
              {loading ? 'Memproses Sistem...' : 'Masuk ke Neco'}
            </button>
          </form>

          {/* SEPARATOR */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-grow h-px bg-gray-100"></div>
            <span className="text-[9px] text-gray-300 font-black uppercase tracking-widest">Atau</span>
            <div className="flex-grow h-px bg-gray-100"></div>
          </div>

          {/* GOOGLE OAUTH BUTTON - Flat tanpa shadow */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-gray-100 hover:bg-gray-200 text-black py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            {/* Google Mini Icon SVG */}
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Masuk dengan Google</span>
          </button>

          <div className="text-center text-[10px] text-gray-400 leading-relaxed pt-2">
            Dengan melanjutkan proses ini, Anda menyetujui <span className="text-gray-500 hover:underline font-semibold cursor-pointer">Ketentuan Layanan</span> dan <span className="text-gray-500 hover:underline font-semibold cursor-pointer">Kebijakan Privasi</span> Neco.
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-4 bg-[#ffffff] text-center">
        <p className="text-[11px] text-gray-400 font-medium">
          &copy; 2026 Neco E-Commerce. Transaksi Aman &amp; Terpercaya.
        </p>
      </footer>
    </div>
  )
}