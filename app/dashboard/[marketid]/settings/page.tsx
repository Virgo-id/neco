'use client'

import { useState, useEffect, use, useRef, ChangeEvent } from 'react'
import { supabase } from '@/utils/supabase'

interface MarketSettings {
  market_name: string
  market_username: string
  market_description: string | null
  market_phone: string
  market_email: string | null
  market_regency: string
  market_address: string
  maps_url: string | null
  market_type: string
  market_logo_url: string
  logo_file: File | null
  existing_photos: string[]
  photos_files: PhotoFileItem[]
}

interface PhotoFileItem {
  file: File
  previewUrl: string
}

export default function SettingsPage({
  params,
}: {
  params: Promise<{ marketid: string }>
}) {
  const { marketid } = use(params)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Ref untuk Auto-Resize Textarea
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const addressRef = useRef<HTMLTextAreaElement>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [coordinatesInput, setCoordinatesInput] = useState('')

  // State untuk Searchable Dropdown Kota / Kabupaten
  const [regencies, setRegencies] = useState<string[]>([])
  const [loadingRegencies, setLoadingRegencies] = useState(false)
  const [searchRegency, setSearchRegency] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // State Form Utama
  const [formData, setFormData] = useState<MarketSettings>({
    market_name: '',
    market_username: '',
    market_description: '',
    market_phone: '',
    market_email: '',
    market_regency: '',
    market_address: '',
    maps_url: '',
    market_type: 'F&B',
    market_logo_url: '',
    logo_file: null,
    existing_photos: [],
    photos_files: [],
  })

  // Fungsi Pembantu Auto-Resize Tinggi Textarea
  const adjustHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  // Efek untuk menyesuaikan tinggi awal saat data selesai di-load
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        adjustHeight(descriptionRef.current)
        adjustHeight(addressRef.current)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [loading, formData.market_description, formData.market_address])

  // 1. Fetch daftar kota/kabupaten
  useEffect(() => {
    const fetchRegencies = async () => {
      try {
        setLoadingRegencies(true)
        const { data, error } = await supabase
          .from('regencies')
          .select('name')
          .order('name', { ascending: true })

        if (error) throw error
        if (data) setRegencies(data.map((item: any) => item.name))
      } catch (err: any) {
        console.error('Gagal mengambil data kota / kabupaten:', err.message)
      } finally {
        setLoadingRegencies(false)
      }
    }
    fetchRegencies()
  }, [])

  // 2. Fetch data setting toko eksisting
  useEffect(() => {
    fetchMarketSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketid])

  const fetchMarketSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('markets')
        .select(
          'market_name, market_username, market_description, market_phone, market_email, market_regency, market_address, latitude, longitude, maps_url, market_type, market_logo_url, market_photos'
        )
        .eq('id', marketid)
        .single()

      if (error) throw error
      if (data) {
        setFormData({
          ...data,
          market_description: data.market_description || '',
          market_email: data.market_email || '',
          market_regency: data.market_regency || '',
          maps_url: data.maps_url || '',
          market_type: data.market_type || 'F&B',
          market_logo_url: data.market_logo_url || '',
          logo_file: null,
          existing_photos: data.market_photos || [],
          photos_files: [],
        })

        if (data.latitude && data.longitude) {
          setCoordinatesInput(`${data.latitude}, ${data.longitude}`)
        }
      }
    } catch (err) {
      console.error('Gagal memuat pengaturan toko:', err)
    } finally {
      setLoading(false)
    }
  }

  // 3. Dropdown Click Outside Listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 4. Blob URL Cleanup
  useEffect(() => {
    return () => {
      if (formData.market_logo_url && formData.market_logo_url.startsWith('blob:')) {
        URL.revokeObjectURL(formData.market_logo_url)
      }
      formData.photos_files.forEach((p) => {
        if (p.previewUrl.startsWith('blob:')) URL.revokeObjectURL(p.previewUrl)
      })
    }
  }, [formData.market_logo_url, formData.photos_files])

  // Utility: Konversi Gambar ke WebP kualitas tinggi
  const convertToWebP = (file: File): Promise<File> => {
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
          if (!ctx) return reject(new Error('Gagal memuat konteks canvas'))
          ctx.drawImage(img, 0, 0)
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Gagal membuat Blob WebP'))
            const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp"
            const webpFile = new File([blob], newFileName, { type: 'image/webp' })
            resolve(webpFile)
          }, 'image/webp', 0.9)
        }
        img.onerror = (err) => reject(err)
      }
      reader.onerror = (err) => reject(err)
    })
  }

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const originalFile = e.target.files[0]
        const webpFile = await convertToWebP(originalFile)
        if (formData.market_logo_url && formData.market_logo_url.startsWith('blob:')) {
          URL.revokeObjectURL(formData.market_logo_url)
        }
        setFormData((prev) => ({
          ...prev,
          logo_file: webpFile,
          market_logo_url: URL.createObjectURL(webpFile)
        }))
      } catch (error) {
        console.error("Gagal memproses Logo ke WebP:", error)
        alert("Gagal memproses gambar logo.")
      }
    }
  }

  const handlePhotosChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      const currentPhotosCount = formData.photos_files.length + formData.existing_photos.length
      if (currentPhotosCount + selectedFiles.length > 5) {
        alert('Maksimal total foto fisik toko adalah 5 foto.')
        return
      }
      try {
        const webpFiles = await Promise.all(selectedFiles.map(file => convertToWebP(file)))
        const newPhotoItems: PhotoFileItem[] = webpFiles.map(file => ({
          file,
          previewUrl: URL.createObjectURL(file)
        }))
        setFormData((prev) => ({
          ...prev,
          photos_files: [...prev.photos_files, ...newPhotoItems]
        }))
      } catch (error) {
        console.error("Gagal memproses foto ke WebP:", error)
        alert("Gagal memproses beberapa gambar toko.")
      }
    }
  }

  const removeNewPhotoFile = (indexToRemove: number) => {
    const itemToRemove = formData.photos_files[indexToRemove]
    if (itemToRemove && itemToRemove.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(itemToRemove.previewUrl)
    }
    setFormData((prev) => ({
      ...prev,
      photos_files: prev.photos_files.filter((_, index) => index !== indexToRemove)
    }))
  }

  const removeExistingPhoto = (urlToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      existing_photos: prev.existing_photos.filter((url) => url !== urlToRemove)
    }))
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    
    if (e.target.tagName === 'TEXTAREA') {
      adjustHeight(e.target as HTMLTextAreaElement)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)

      if (!formData.market_regency) {
        throw new Error('Kota / Kabupaten wajib dipilih.')
      }

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
            throw new Error('Format koordinat tidak valid. Harus berupa angka desimal.')
          }
        } else {
          throw new Error('Format koordinat salah. Pisahkan Latitude dan Longitude dengan koma.')
        }
      } else {
        throw new Error('Koordinat lokasi wajib diisi.')
      }

      let uploadedLogoUrl = formData.market_logo_url
      if (formData.logo_file) {
        const logoFileName = `${marketid}_${Date.now()}_logo.webp`
        const { error: uploadLogoErr } = await supabase.storage
          .from('market-logos')
          .upload(logoFileName, formData.logo_file)

        if (uploadLogoErr) throw uploadLogoErr

        const { data: { publicUrl } } = supabase.storage
          .from('market-logos')
          .getPublicUrl(logoFileName)
        uploadedLogoUrl = publicUrl
      }

      let uploadedPhotosUrls: string[] = [...formData.existing_photos]
      if (formData.photos_files && formData.photos_files.length > 0) {
        for (const photoItem of formData.photos_files) {
          const uniqueString = Math.random().toString(36).substring(7)
          const photoFileName = `${marketid}_${Date.now()}_${uniqueString}.webp`
          
          const { error: uploadPhotoErr } = await supabase.storage
            .from('market-photos')
            .upload(photoFileName, photoItem.file)

          if (uploadPhotoErr) throw uploadPhotoErr

          const { data: { publicUrl } } = supabase.storage
            .from('market-photos')
            .getPublicUrl(photoFileName)
          uploadedPhotosUrls.push(publicUrl)
        }
      }

      const { error } = await supabase
        .from('markets')
        .update({
          market_name: formData.market_name,
          market_username: formData.market_username,
          market_description: formData.market_description || null,
          market_phone: formData.market_phone,
          market_email: formData.market_email || null,
          market_regency: formData.market_regency,
          market_address: formData.market_address,
          latitude: finalLat,
          longitude: finalLng,
          maps_url: formData.maps_url || null,
          market_type: formData.market_type,
          market_logo_url: uploadedLogoUrl,
          market_photos: uploadedPhotosUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', marketid)

      if (error) throw error
      alert('Pengaturan toko berhasil diperbarui!')
      fetchMarketSettings()
    } catch (err: any) {
      console.error('Gagal menyimpan pengaturan toko:', err)
      alert(err.message || 'Terjadi kesalahan saat memperbarui profil toko.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredRegencies = regencies.filter((name) =>
    name.toLowerCase().includes(searchRegency.toLowerCase())
  )

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 text-center text-xs sm:text-sm font-semibold text-gray-400 animate-pulse m-4">
        Memuat pengaturan konfigurasi toko...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl px-4 sm:px-0 py-4">
      {/* HEADER */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <h2 className="text-base sm:text-lg font-black text-gray-950">Pengaturan Toko</h2>
        <p className="text-[11px] sm:text-xs font-semibold text-gray-400 mt-1 leading-relaxed">
          Sesuaikan informasi profil, berkas media, dan lokasi koordinat operasional toko Anda
        </p>
      </div>

      {/* FORM PENGATURAN */}
      <form onSubmit={handleFormSubmit} className="space-y-6">
        
        {/* SECTION: BUCKET STORAGE UPLOAD (MEDIA TOKO) */}
        <div className="flex flex-col gap-6 bg-gray-50 p-5 rounded-2xl border border-gray-200">
          
          {/* LOGO (Atas Tengah) */}
          <div className="flex flex-col items-center justify-center text-center pb-4 border-b border-gray-200/80">
            <label className="block text-xs font-black text-gray-900 uppercase tracking-wider mb-3">
              Logo Toko
            </label>
            <div className="flex justify-center">
              {formData.market_logo_url ? (
                <div className="relative w-32 h-32 rounded-2xl border border-gray-200 overflow-hidden bg-white group shadow-sm">
                  <img src={formData.market_logo_url} alt="Logo Preview" className="w-full h-full object-cover" />
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold cursor-pointer">
                    Ganti Logo
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                </div>
              ) : (
                <label className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-1.5 bg-white cursor-pointer hover:border-red-500 hover:bg-red-50/20 transition-all shadow-sm">
                  <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Upload Logo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
              )}
            </div>
          </div>

          {/* FOTO-FOTO AREA TOKO (Bawahnya) */}
          <div>
            <label className="block text-xs font-black text-gray-900 uppercase tracking-wider mb-3">
              Foto Tempat / Area Toko ({formData.existing_photos.length + formData.photos_files.length}/5)
            </label>
            <div className="flex flex-wrap gap-3">
              {formData.existing_photos.map((url: string, index: number) => (
                <div key={`exist-${index}`} className="relative w-28 h-28 rounded-xl border border-gray-200 overflow-hidden bg-white group">
                  <img src={url} alt="Existing Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeExistingPhoto(url)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {formData.photos_files.map((photoItem, index: number) => (
                <div key={`new-${index}`} className="relative w-28 h-28 rounded-xl border border-emerald-300 overflow-hidden bg-white group ring-2 ring-emerald-50">
                  <img src={photoItem.previewUrl} alt="New Preview" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase">WebP</span>
                  <button type="button" onClick={() => removeNewPhotoFile(index)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {(formData.existing_photos.length + formData.photos_files.length) < 5 && (
                <label className="w-28 h-28 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 bg-white cursor-pointer hover:border-red-500 hover:bg-red-50/20 transition-all">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Tambah</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosChange} />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* SEKSI 1: INFORMASI UTAMA */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <h3 className="text-xs sm:text-sm font-black text-gray-950 border-b border-gray-100 pb-2 uppercase tracking-wider">
            Informasi Profil
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Nama Toko</label>
              <input
                type="text"
                name="market_name"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:bg-white focus:border-red-500 transition-all"
                value={formData.market_name}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Username Toko (URL ID Link)</label>
              <input
                type="text"
                name="market_username"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:bg-white focus:border-red-500 transition-all"
                value={formData.market_username}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Deskripsi & Info Toko</label>
            <textarea
              ref={descriptionRef}
              name="market_description"
              rows={2}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:bg-white focus:border-red-500 overflow-hidden resize-none transition-all min-h-[70px]"
              placeholder="Tuliskan deskripsi singkat mengenai keunikan produk atau operasional usaha Anda..."
              value={formData.market_description || ''}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Tipe Bisnis</label>
              <select
                name="market_type"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:bg-white focus:border-red-500 transition-all h-[34px] sm:h-[42px]"
                value={formData.market_type}
                onChange={handleInputChange}
              >
                <option value="F&B">F&B</option>
                <option value="Retail">Retail</option>
                <option value="Jasa">Jasa</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">No. HP Operasional</label>
              <input
                type="tel"
                name="market_phone"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:bg-white focus:border-red-500 transition-all"
                value={formData.market_phone}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Email Bisnis (Opsional)</label>
              <input
                type="email"
                name="market_email"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:bg-white focus:border-red-500 transition-all"
                value={formData.market_email || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        {/* SEKSI 2: LOKASI PENGIRIMAN & ADRESAL */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <h3 className="text-xs sm:text-sm font-black text-red-600 border-b border-gray-100 pb-2 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Lokasi Pengiriman & Alamat Toko
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Alamat Lengkap Toko</label>
              <textarea
                ref={addressRef}
                name="market_address"
                rows={2}
                required
                placeholder="Tulis jalan, nomor rumah, RT/RW, kecamatan..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:bg-white focus:border-red-500 overflow-hidden resize-none transition-all min-h-[70px]"
                value={formData.market_address}
                onChange={handleInputChange}
              />
            </div>

            {/* SEARCHABLE DROPDOWN KOTA / KABUPATEN */}
            <div className="sm:col-span-1 relative space-y-1" ref={dropdownRef}>
              <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Kota / Kabupaten</label>
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 focus-within:border-red-500 focus-within:bg-white outline-none transition-all cursor-pointer flex justify-between items-center h-[34px] sm:h-[42px]"
              >
                <span className={formData.market_regency ? "text-gray-900" : "text-gray-300"}>
                  {formData.market_regency || "Pilih kota / kabupaten"}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-60 flex flex-col">
                  <div className="p-2 border-b border-gray-100 bg-gray-50">
                    <input 
                      type="text" 
                      placeholder="Cari kota / kabupaten..." 
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all"
                      value={searchRegency}
                      onChange={(e) => setSearchRegency(e.target.value)}
                      onClick={(e) => e.stopPropagation()} 
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 max-h-44 divide-y divide-gray-50">
                    {loadingRegencies ? (
                      <div className="p-3 text-xs text-center text-gray-400 font-medium">Memuat data...</div>
                    ) : filteredRegencies.length > 0 ? (
                      filteredRegencies.map((name, idx) => (
                        <div 
                          key={idx}
                          onClick={() => {
                            setFormData({ ...formData, market_regency: name })
                            setIsDropdownOpen(false)
                            setSearchRegency('')
                          }}
                          className={`p-3 text-xs font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors ${formData.market_regency === name ? 'bg-red-50/50 text-red-600 font-bold' : ''}`}
                        >
                          {name}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-center text-gray-400">Kota / Kabupaten tidak ditemukan</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Koordinat Google Maps (Latitude, Longitude)</label>
              <input
                type="text"
                required
                placeholder="Contoh: -7.050513, 113.655734"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:bg-white focus:border-red-500 transition-all placeholder:text-gray-300"
                value={coordinatesInput}
                onChange={(e) => setCoordinatesInput(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Google Maps URL (Opsional)</label>
              <input
                type="url"
                name="maps_url"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:bg-white focus:border-red-500 transition-all"
                placeholder="http://maps.google.com/..."
                value={formData.maps_url || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        {/* TOMBOL AKSI AKHIR */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 disabled:bg-gray-200 text-white disabled:text-gray-400 px-6 py-3 rounded-xl text-xs font-black transition-all shadow-md shadow-red-100 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Menyimpan Perubahan...</span>
              </>
            ) : (
              'Simpan Semua Konfigurasi'
            )}
          </button>
        </div>

      </form>
    </div>
  )
}