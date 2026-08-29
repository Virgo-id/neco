// components/market/MarketModal.tsx
'use client'

import { useState, useEffect, ChangeEvent, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import ImageUploader, { PhotoFileItem } from './marketmodal/ImageUploader'
import MarketBasicInfoForm from './marketmodal/MarketBasicInfoForm'

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId?: string | null;
  onSuccess?: () => void;
}

export default function MarketModal({ isOpen, onClose, marketId = null, onSuccess }: MarketModalProps) {
  const isEditMode = !!marketId
  const modalRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(isEditMode)
  const [updating, setUpdating] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [coordinatesInput, setCoordinatesInput] = useState('')

  const [regencies, setRegencies] = useState<string[]>([])
  const [loadingRegencies, setLoadingRegencies] = useState(false)

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

  // Reset form saat modal dibuka/ditutup
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

  // Fetch daftar kota/kabupaten
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
          setRegencies(data.map((item: { name: string }) => item.name))
        }
      } catch (err: any) {
        console.error('Gagal mengambil data kota / kabupaten:', err.message)
      } finally {
        setLoadingRegencies(false)
      }
    }
    fetchRegencies()
  }, [isOpen])

  // Fetch data lama jika mode edit
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

  // Clean Up URL Blob
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

  // Lock body scroll saat modal aktif
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

  const handleFormFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-4xl p-6 md:p-8 overflow-y-auto max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-150"
      >
        <button
          onClick={onClose}
          type="button"
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
              <ImageUploader
                marketLogoUrl={formData.market_logo_url}
                existingPhotos={formData.existing_photos}
                photosFiles={formData.photos_files}
                onLogoChange={handleLogoChange}
                onPhotosChange={handlePhotosChange}
                onRemoveNewPhoto={removeNewPhotoFile}
                onRemoveExistingPhoto={removeExistingPhoto}
              />

              <MarketBasicInfoForm
                formData={formData}
                coordinatesInput={coordinatesInput}
                regencies={regencies}
                loadingRegencies={loadingRegencies}
                isOpen={isOpen}
                loading={loading}
                onChangeFormData={handleFormFieldChange}
                onChangeCoordinates={setCoordinatesInput}
              />

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
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