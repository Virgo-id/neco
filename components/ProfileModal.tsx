'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import { X, MapPin, Plus, Loader2 } from 'lucide-react'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
}

export default function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State utama untuk database
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
    home_photo_urls: [] as string[],
  })

  // State lokal khusus untuk koordinat di UI
  const [coordinatesInput, setCoordinatesInput] = useState('')

  useEffect(() => {
    if (isOpen && user) {
      fetchProfileData()
    }
  }, [isOpen, user])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      setMessage({ text: '', type: '' })

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
      } else {
        setCoordinatesInput('')
      }
    } catch (error: any) {
      setMessage({ text: 'Gagal memuat data profil.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Kompresi Gambar ke WebP
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

  // Unggah Foto ke Supabase Storage + Simpan ke DB
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files
      if (!files || files.length === 0) return

      if (profile.home_photo_urls.length >= 5) {
        throw new Error('Maksimal foto rumah yang dapat diunggah adalah 5 foto.')
      }

      setUploadingPhoto(true)
      setMessage({ text: '', type: '' })

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
      
      setMessage({ text: 'Foto rumah berhasil diunggah dan disimpan!', type: 'success' })
    } catch (error: any) {
      setMessage({ text: error.message || 'Gagal mengunggah foto.', type: 'error' })
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Hapus Foto + Simpan ke DB
  const handleRemovePhoto = async (indexToRemove: number) => {
    try {
      setUploadingPhoto(true)
      setMessage({ text: '', type: '' })

      const updatedUrls = profile.home_photo_urls.filter((_, index) => index !== indexToRemove)

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
    } catch (error: any) {
      setMessage({ text: error.message || 'Gagal menghapus foto.', type: 'error' })
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setMessage({ text: '', type: '' })

    try {
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
          home_photo_url: profile.home_photo_urls,
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
    } catch (error: any) {
      setMessage({ text: error.message || 'Gagal memperbarui profil.', type: 'error' })
    } finally {
      setUpdating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop tanpa blur */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Container Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white sticky top-0 z-20">
          <div>
            <h3 className="text-base font-black text-gray-950 tracking-tight">Pengaturan Profil</h3>
            <p className="text-xs text-gray-500 mt-0.5">Kelola identitas utama dan lokasi pengiriman Anda.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Modal (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs font-semibold text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin text-red-600" />
              <span>Memuat data profil...</span>
            </div>
          ) : (
            <form id="profile-form" onSubmit={handleUpdateProfile} className="space-y-5">
              
              {message.text && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold ${
                  message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1 px-1">Email System</label>
                  <input
                    type="text"
                    disabled
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-400 font-medium cursor-not-allowed outline-none select-none"
                    value={profile.email}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1 px-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none transition-all"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1 px-1">Nomor Handphone</label>
                  <input
                    type="tel"
                    required
                    placeholder="08123456789"
                    className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none transition-all"
                    value={profile.phone_number}
                    onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1 px-1">Role Akun</label>
                  <input
                    type="text"
                    disabled
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-400 font-medium cursor-not-allowed outline-none capitalize"
                    value={profile.role}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1 px-1">Status Akun</label>
                  <input
                    type="text"
                    disabled
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-400 font-medium cursor-not-allowed outline-none capitalize"
                    value={profile.status}
                  />
                </div>
              </div>

              {/* LOGISTICS BLOCK */}
              <div className="pt-4 border-t border-gray-100">
                <div className="text-[11px] font-black text-red-600 uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Detail Lokasi & Alamat Rumah
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1 px-1">Alamat Rumah Tinggal</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Tuliskan nama jalan, RT/RW, nomor rumah, kecamatan..."
                      className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none resize-none transition-all"
                      value={profile.home_address}
                      onChange={(e) => setProfile({ ...profile, home_address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1 px-1">
                        Koordinat Maps (Lat, Lng)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="-8.101977, 113.852145"
                        className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none transition-all placeholder:text-gray-300"
                        value={coordinatesInput}
                        onChange={(e) => setCoordinatesInput(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1 px-1">Google Maps URL</label>
                      <input
                        type="url"
                        placeholder="http://maps.google.com/..."
                        className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none transition-all"
                        value={profile.google_maps_url}
                        onChange={(e) => setProfile({ ...profile, google_maps_url: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* IMAGE GRID BLOCK */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider px-1">
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

                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {profile.home_photo_urls.map((url, index) => (
                        <div key={index} className="relative aspect-square w-full rounded-xl bg-gray-50 border border-gray-100 overflow-hidden group">
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
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-40"
                          >
                            ✕
                          </button>
                        </div>
                      ))}

                      {profile.home_photo_urls.length < 5 && (
                        <button
                          type="button"
                          disabled={uploadingPhoto}
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square w-full rounded-xl border border-dashed border-gray-200 hover:border-red-500 hover:bg-red-50/20 flex flex-col items-center justify-center gap-1 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploadingPhoto ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                          ) : (
                            <Plus className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />
                          )}
                          <span className="text-[9px] font-black text-gray-400 group-hover:text-red-600 uppercase tracking-wider select-none">
                            {uploadingPhoto ? 'Proses...' : 'Tambah'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </form>
          )}
        </div>

        {/* Footer Modal */}
        <div className="border-t border-gray-100 px-6 py-3 bg-gray-50/50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="profile-form"
            disabled={updating || uploadingPhoto || loading}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {updating ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>

      </div>
    </div>
  )
}