'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  // State utama untuk database (Role default diubah menjadi 'user')
  const [profile, setProfile] = useState({
    email: '',
    full_name: '',
    phone_number: '',
    role: 'user',
    status: 'active',
    home_address: '',
    latitude: '',
    longitude: '',
    google_maps_url: '',
    home_photo_urls: [] as string[], // Berubah menjadi array untuk menampung banyak foto
  })

  // State lokal khusus untuk koordinat di UI
  const [coordinatesInput, setCoordinatesInput] = useState('')

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError
      }

      const lat = profileData?.latitude ? String(profileData.latitude) : ''
      const lng = profileData?.longitude ? String(profileData.longitude) : ''
      
      // Ambil array foto dari database, pastikan fallback ke array kosong jika null
      const photosArray = Array.isArray(profileData?.home_photo_url) 
        ? profileData.home_photo_url.filter(Boolean)
        : profileData?.home_photo_url ? [profileData.home_photo_url] : []

      setProfile({
        email: user.email || '',
        full_name: profileData?.full_name || '',
        phone_number: profileData?.phone_number || '',
        role: profileData?.role || 'user',
        status: profileData?.status || 'active',
        home_address: profileData?.home_address || '',
        latitude: lat,
        longitude: lng,
        google_maps_url: profileData?.google_maps_url || '',
        home_photo_urls: photosArray,
      })

      if (lat && lng) {
        setCoordinatesInput(`${lat}, ${lng}`)
      }
    } catch (error: any) {
      setMessage({ text: 'Gagal memuat data profil.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Trik Frontend Kompresi Gambar ke WebP
  const convertToWebp = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) return reject(new Error('Gagal memproses kanvas gambar.'))
          ctx.drawImage(img, 0, 0)
          canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Gagal mengonversi gambar ke WebP.'))
          }, 'image/webp', 0.85)
        }
      }
      reader.onerror = (error) => reject(error)
    })
  }

  // Fungsi Unggah Banyak Foto ke Supabase Storage + Otomatis Simpan Instan ke DB
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files
      if (!files || files.length === 0) return

      // Validasi Batasan Maksimal 5 Gambar
      if (profile.home_photo_urls.length >= 5) {
        throw new Error('Maksimal foto rumah yang dapat diunggah adalah 5 foto.')
      }

      setUploadingPhoto(true)
      setMessage({ text: '', type: '' })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi pengguna tidak valid.')

      const originalFile = files[0]
      const webpBlob = await convertToWebp(originalFile)
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.webp`

      const { error: uploadError } = await supabase.storage
        .from('home-photos')
        .upload(fileName, webpBlob, {
          contentType: 'image/webp',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('home-photos')
        .getPublicUrl(fileName)

      const updatedUrls = [...profile.home_photo_urls, publicUrl]

      // [TRICK] Otomatis Simpan array foto baru langsung ke tabel Supabase Profiles
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          home_photo_url: updatedUrls,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (dbError) throw dbError

      // Perbarui state local jika penulisan ke database berhasil dilakukan
      setProfile((prev) => ({ 
        ...prev, 
        home_photo_urls: updatedUrls 
      }))
      
      setMessage({ text: 'Foto rumah berhasil diunggah dan disimpan otomatis!', type: 'success' })
      
      // Otomatis scroll ke atas agar banner sukses terlihat
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error: any) {
      setMessage({ text: error.message || 'Gagal mengunggah foto.', type: 'error' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = '' // Reset input file
    }
  }

  // Fungsi untuk menghapus foto + Otomatis Simpan Instan ke DB
  const handleRemovePhoto = async (indexToRemove: number) => {
    try {
      setUploadingPhoto(true)
      setMessage({ text: '', type: '' })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi pengguna tidak valid.')

      const updatedUrls = profile.home_photo_urls.filter((_, index) => index !== indexToRemove)

      // [TRICK] Langsung simpan perubahan array yang berkurang ke database
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          home_photo_url: updatedUrls,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (dbError) throw dbError

      setProfile((prev) => ({
        ...prev,
        home_photo_urls: updatedUrls
      }))

      setMessage({ text: 'Foto rumah berhasil dihapus!', type: 'success' })
      
      // Otomatis scroll ke atas agar banner sukses terlihat
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error: any) {
      setMessage({ text: error.message || 'Gagal menghapus foto.', type: 'error' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setMessage({ text: '', type: '' })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let finalLat: number | null = null
      let finalLng: number | null = null

      if (coordinatesInput.trim()) {
        const parts = coordinatesInput.split(',')
        if (parts.length === 2) {
          const parsedLat = parseFloat(parts[0].trim())
          const parsedLng = parseFloat(parts[1].trim())

          if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            finalLat = parsedLat
            finalLng = parsedLng
          } else {
            throw new Error('Format koordinat tidak valid. Pastikan berupa angka dipisah koma.')
          }
        } else {
          throw new Error('Format koordinat salah. Harus berisi Latitude dan Longitude (dipisah oleh satu koma).')
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          home_address: profile.home_address,
          latitude: finalLat,
          longitude: finalLng,
          google_maps_url: profile.google_maps_url || null,
          home_photo_url: profile.home_photo_urls, // Tetap jaga sinkronisasi form utama
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error
      
      setProfile((prev) => ({
        ...prev,
        latitude: finalLat ? String(finalLat) : '',
        longitude: finalLng ? String(finalLng) : ''
      }))

      setMessage({ text: 'Profil Anda berhasil diperbarui!', type: 'success' })
      
      // Otomatis scroll ke atas agar banner sukses terlihat
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error: any) {
      setMessage({ text: error.message || 'Gagal memperbarui profil.', type: 'error' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 text-sm font-semibold text-gray-500">
        <svg className="animate-spin h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Memuat data profil...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased py-8 md:py-12">
      <main className="max-w-4xl w-full mx-auto px-4">
        
        <div className="bg-white rounded-2xl p-6 md:p-8">
          <div className="pb-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-black text-gray-950 tracking-tight">Pengaturan Profil</h1>
              <p className="text-sm text-gray-500 mt-0.5">Kelola identitas utama Anda untuk sinkronisasi data transaksi yang akurat.</p>
            </div>
            
            <Link href="/" className="text-sm font-bold text-gray-600 hover:text-red-600 transition-colors flex items-center gap-1.5 group self-start sm:self-center">
              <svg className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Kembali ke Beranda
            </Link>
          </div>

          {message.text && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-semibold transition-all ${
              message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5 px-1">Email System</label>
                <input
                  type="text"
                  disabled
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-400 font-medium cursor-not-allowed outline-none select-none"
                  value={profile.email}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-white rounded-xl text-sm font-medium text-gray-900 focus:ring-1 focus:ring-red-600 outline-none transition-all"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">Nomor Handphone</label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 08123456789"
                  className="w-full px-4 py-2.5 bg-white rounded-xl text-sm font-medium text-gray-900 focus:ring-1 focus:ring-red-600 outline-none transition-all"
                  value={profile.phone_number}
                  onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5 px-1">Role Akun</label>
                <input
                  type="text"
                  disabled
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-400 font-medium cursor-not-allowed outline-none capitalize"
                  value={profile.role}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5 px-1">Status Akun</label>
                <input
                  type="text"
                  disabled
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-400 font-medium cursor-not-allowed outline-none capitalize"
                  value={profile.status}
                />
              </div>
            </div>

            {/* LOGISTICS BLOCK */}
            <div className="pt-6 mt-4">
              <div className="text-xs font-black text-red-600 uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Detail Lokasi & Alamat Rumah
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">Alamat Rumah Tinggal</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Tuliskan nama jalan, RT/RW, nomor rumah, kecamatan..."
                    className="w-full px-4 py-2.5 bg-white rounded-xl text-sm font-medium text-gray-900 focus:ring-1 focus:ring-red-600 outline-none resize-none transition-all"
                    value={profile.home_address}
                    onChange={(e) => setProfile({ ...profile, home_address: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">
                    Koordinat Google Maps (Latitude, Longitude)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Tempel langsung dari Google Maps. Contoh: -8.101977, 113.852145"
                    className="w-full px-4 py-2.5 bg-white rounded-xl text-sm font-medium text-gray-900 focus:ring-1 focus:ring-red-600 outline-none transition-all placeholder:text-gray-300"
                    value={coordinatesInput}
                    onChange={(e) => setCoordinatesInput(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">Google Maps URL</label>
                  <input
                    type="url"
                    placeholder="http://maps.google.com/..."
                    className="w-full px-4 py-2.5 bg-white rounded-xl text-sm font-medium text-gray-900 focus:ring-1 focus:ring-red-600 outline-none transition-all"
                    value={profile.google_maps_url}
                    onChange={(e) => setProfile({ ...profile, google_maps_url: e.target.value })}
                  />
                </div>

                {/* IMAGE GRID BLOCK */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider px-1">
                    Foto Rumah Tinggal ({profile.home_photo_urls.length}/5)
                  </label>
                  
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={profile.home_photo_urls.length >= 5 || uploadingPhoto}
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {/* Render Daftar Foto */}
                    {profile.home_photo_urls.map((url, index) => (
                      <div key={index} className="relative aspect-square w-full rounded-xl bg-gray-50 overflow-hidden group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={url} 
                          alt={`Foto Rumah ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          disabled={uploadingPhoto}
                          onClick={() => handleRemovePhoto(index)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-40"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* Tombol Unggah */}
                    {profile.home_photo_urls.length < 5 && (
                      <button
                        type="button"
                        disabled={uploadingPhoto}
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square w-full rounded-xl bg-gray-50 hover:bg-red-50/30 flex flex-col items-center justify-center gap-2 transition-all group disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                      >
                        {uploadingPhoto ? (
                          <svg className="animate-spin h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-gray-400 group-hover:text-red-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                        <span className="text-[10px] font-black text-gray-400 group-hover:text-red-600 uppercase tracking-wider select-none">
                          {uploadingPhoto ? 'Proses...' : 'Tambah'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={updating || uploadingPhoto}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updating ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}