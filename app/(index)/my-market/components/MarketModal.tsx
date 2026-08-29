'use client'

import { useState, useEffect, ChangeEvent, useRef } from 'react'
import { supabase } from '@/utils/supabase'

interface PhotoFileItem {
  file: File;
  previewUrl: string;
}

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId?: string | null; // Jika diisi, otomatis mode edit
  onSuccess?: () => void; // Callback setelah submit berhasil
}

export default function MarketModal({ isOpen, onClose, marketId = null, onSuccess }: MarketModalProps) {
  const isEditMode = !!marketId
  const dropdownRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  
  // Ref tambahan untuk Auto Resize Textarea
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const addressRef = useRef<HTMLTextAreaElement>(null)

  const [loading, setLoading] = useState(isEditMode)
  const [updating, setUpdating] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [coordinatesInput, setCoordinatesInput] = useState('')

  // State untuk Dropdown Kota / Kabupaten dari Supabase
  const [regencies, setRegencies] = useState<string[]>([])
  const [loadingRegencies, setLoadingRegencies] = useState(false)
  const [searchRegency, setSearchRegency] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // State form khusus untuk Toko / Market
  const [formData, setFormData] = useState<{
    market_name: string;
    market_username: string;
    market_phone: string;
    market_description: string;
    market_regency: string;
    market_address: string;
    maps_url: string;
    market_type: string;
    logo_file: File | null;
    market_logo_url: string;
    photos_files: PhotoFileItem[];
    existing_photos: string[];
  }>({
    market_name: '',
    market_username: '',
    market_phone: '',
    market_description: '',
    market_regency: '',     
    market_address: '',
    maps_url: '',
    market_type: 'F&B',     
    logo_file: null,          
    market_logo_url: '',     
    photos_files: [],        
    existing_photos: [],     
  })

  // Efek untuk menangani Auto Resize tinggi Textarea secara dinamis
  useEffect(() => {
    if (isOpen && !loading) {
      const adjustHeight = (ref: React.RefObject<HTMLTextAreaElement | null>) => {
        if (ref.current) {
          ref.current.style.height = 'auto' // Reset tinggi terlebih dahulu
          ref.current.style.height = `${ref.current.scrollHeight}px` // Set tinggi baru berdasarkan konten
        }
      }
      
      adjustHeight(descriptionRef)
      adjustHeight(addressRef)
    }
  }, [formData.market_description, formData.market_address, isOpen, loading])

  // Reset form saat modal dibuka/ditutup atau marketId berubah
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        market_name: '',
        market_username: '',
        market_phone: '',
        market_description: '',
        market_regency: '',     
        market_address: '',
        maps_url: '',
        market_type: 'F&B',     
        logo_file: null,          
        market_logo_url: '',     
        photos_files: [],        
        existing_photos: [],
      })
      setCoordinatesInput('')
      setErrorMsg('')
    } else {
      setLoading(isEditMode)
    }
  }, [isOpen, isEditMode])

  // Fetch daftar kota / kabupaten dari Supabase
  useEffect(() => {
    if (!isOpen) return
    const fetchRegencies = async () => {
      try {
        setLoadingRegencies(true)
        const { data, error } = await supabase
          .from('regencies')
          .select('name')
          .order('name', { ascending: true })

        if (error) throw error

        if (data) {
          setRegencies(data.map((item: any) => item.name))
        }
      } catch (err: any) {
        console.error('Gagal mengambil data kota / kabupaten:', err.message)
      } finally {
        setLoadingRegencies(false)
      }
    }

    fetchRegencies()
  }, [isOpen])

  // Ambil data lama jika dalam mode Edit
  useEffect(() => {
    if (isOpen && isEditMode && marketId) {
      const fetchMarketData = async () => {
        try {
          setLoading(true)
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            setErrorMsg('Sesi user tidak ditemukan. Silakan login kembali.')
            return
          }

          const { data: market, error } = await supabase
            .from('markets')
            .select('*')
            .eq('id', marketId)
            .eq('owner_id', user.id)
            .single()

          if (error || !market) throw new Error('Data toko tidak ditemukan.')

          setFormData({
            market_name: market.market_name || '',
            market_username: market.market_username || '',
            market_phone: market.market_phone || '',
            market_description: market.market_description || '',
            market_regency: market.market_regency || '', 
            market_address: market.market_address || '',
            maps_url: market.maps_url || '',
            market_type: market.market_type || 'F&B',
            logo_file: null,
            market_logo_url: market.market_logo_url || '',
            photos_files: [],
            existing_photos: market.market_photos || [],
          })

          if (market.latitude && market.longitude) {
            setCoordinatesInput(`${market.latitude}, ${market.longitude}`)
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Gagal memuat data toko.')
        } finally {
          setLoading(false)
        }
      }
      fetchMarketData()
    }
  }, [isOpen, isEditMode, marketId])

  // Menutup dropdown ketika klik di luar area komponen dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Efek Pembersihan URL Blob lokal
  useEffect(() => {
    return () => {
      if (formData.market_logo_url && formData.market_logo_url.startsWith('blob:')) {
        URL.revokeObjectURL(formData.market_logo_url)
      }
      formData.photos_files.forEach((p) => {
        if (p.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(p.previewUrl)
        }
      })
    }
  }, [formData.market_logo_url, formData.photos_files])

  // Cegah scroll pada body saat modal aktif
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setErrorMsg('')

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Sesi kedaluwarsa. Silakan masuk kembali.')
      }

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
        const logoFileName = `${user.id}_${Date.now()}_logo.webp`
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
          const photoFileName = `${user.id}_${Date.now()}_${uniqueString}.webp`
          
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

      const payload: any = {
        market_name: formData.market_name,
        market_username: formData.market_username,
        market_phone: formData.market_phone,
        market_description: formData.market_description || null,
        market_regency: formData.market_regency, 
        market_address: formData.market_address,
        latitude: finalLat,
        longitude: finalLng,
        maps_url: formData.maps_url || null,
        market_logo_url: uploadedLogoUrl,
        market_photos: uploadedPhotosUrls,
        market_type: formData.market_type, 
        updated_at: new Date().toISOString()
      }

      if (isEditMode && marketId) {
        const { error: dbError } = await supabase
          .from('markets')
          .update(payload)
          .eq('id', marketId)
          .eq('owner_id', user.id)

        if (dbError) throw dbError
        alert('Profil toko berhasil diperbarui!')
      } else {
        const insertPayload = {
          ...payload,
          owner_id: user.id,
          is_active: true,
          market_wallet: 0.00
        }
        const { error: dbError } = await supabase
          .from('markets')
          .insert([insertPayload])

        if (dbError) throw dbError
        alert('Toko baru berhasil didaftarkan!')
      }

      if (onSuccess) onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Detail Kendala Sistem:", error)
      setErrorMsg(error.message || 'Terjadi kesalahan sistem database.')
    } finally {
      setUpdating(false)
    }
  }

  const filteredRegencies = regencies.filter((name) =>
    name.toLowerCase().includes(searchRegency.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        ref={modalRef}
        className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-4xl p-6 md:p-8 overflow-y-auto max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Tombol Close X */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="pb-4 mb-6 border-b border-gray-100 pr-8">
          <h1 className="text-xl font-black text-gray-950 tracking-tight">
            {isEditMode ? 'Edit Profil Toko' : 'Daftarkan Toko Baru'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEditMode ? 'Perbarui data operasional unit bisnis toko Anda.' : 'Atur detail parameter unit bisnis operasional toko Anda.'}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-sm font-semibold text-gray-500 py-12">
            <svg className="animate-spin h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Memuat data toko...</span>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* SECTION: BUCKET STORAGE UPLOAD */}
              <div className="grid grid-cols-1 gap-6 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                {/* LOGO */}
                <div>
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-wider mb-2">Logo Toko</label>
                  <div className="flex flex-wrap gap-3">
                    {formData.market_logo_url ? (
                      <div className="relative w-28 h-28 rounded-xl border border-gray-200 overflow-hidden bg-white group">
                        <img src={formData.market_logo_url} alt="Logo Preview" className="w-full h-full object-cover" />
                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold cursor-pointer">
                          Ganti Logo
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                        </label>
                      </div>
                    ) : (
                      <label className="w-28 h-28 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 bg-white cursor-pointer hover:border-red-500 hover:bg-red-50/20 transition-all">
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Upload</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                      </label>
                    )}
                  </div>
                </div>

                {/* FOTO-FOTO TOKO */}
                <div>
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-wider mb-2">
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

              {/* SECTION: DATA INFORMASI FORM */}
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">Nama Toko / Lapak</label>
                  <input type="text" required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all" value={formData.market_name} onChange={(e) => setFormData({ ...formData, market_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">Username Toko (ID Unik Link)</label>
                  <input type="text" required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all" value={formData.market_username} onChange={(e) => setFormData({ ...formData, market_username: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">No. HP Operasional</label>
                  <input type="tel" required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all" value={formData.market_phone} onChange={(e) => setFormData({ ...formData, market_phone: e.target.value })} />
                </div>
              </div>

              {/* TEXTAREA DESKRIPSI (AUTO RESIZE) */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">Deskripsi & Info Toko</label>
                <textarea 
                  ref={descriptionRef}
                  rows={2} 
                  placeholder="Tulis keunikan produk atau info jam operasional toko Anda..." 
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none resize-none transition-all overflow-hidden" 
                  value={formData.market_description} 
                  onChange={(e) => setFormData({ ...formData, market_description: e.target.value })} 
                />
              </div>

              {/* GEOLOCATION */}
              <div className="pt-6 mt-4 border-t border-gray-100">
                <div className="text-xs font-black text-red-600 uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Lokasi Pengiriman & Alamat Toko
                </div>
                
                <div className="space-y-5">
                  {/* TEXTAREA ALAMAT LENGKAP (AUTO RESIZE) */}
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">Alamat Lengkap Toko</label>
                    <textarea 
                      ref={addressRef}
                      rows={2} 
                      required 
                      placeholder="Tulis jalan, nomor rumah, RT/RW, kecamatan..." 
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none resize-none transition-all overflow-hidden" 
                      value={formData.market_address} 
                      onChange={(e) => setFormData({ ...formData, market_address: e.target.value })} 
                    />
                  </div>

                  {/* SEARCHABLE DROPDOWN KOTA / KABUPATEN */}
                  <div className="relative" ref={dropdownRef}>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">Kota / Kabupaten</label>
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-600 outline-none transition-all cursor-pointer flex justify-between items-center"
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

                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">Koordinat Google Maps (Latitude, Longitude)</label>
                    <input type="text" required placeholder="Contoh: -7.050513, 113.655734" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all placeholder:text-gray-300" value={coordinatesInput} onChange={(e) => setCoordinatesInput(e.target.value)} />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">Maps URL (Opsional)</label>
                    <input type="url" placeholder="http://maps.google.com/..." className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all" value={formData.maps_url} onChange={(e) => setFormData({ ...formData, maps_url: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={onClose} className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={updating} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {updating ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>{isEditMode ? 'Memperbarui...' : 'Mendaftarkan...'}</span>
                    </>
                  ) : (
                    isEditMode ? 'Simpan Perubahan' : 'Daftarkan Toko'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}