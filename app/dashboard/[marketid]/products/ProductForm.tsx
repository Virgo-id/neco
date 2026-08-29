'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import FormRequiredFields from './FormRequiredFields'
import FormOptionalFields from './FormOptionalFields'

export interface Product {
  id: string
  product_name: string
  main_image_url: string[]
  category_name: string
  sku: string | null
  capital_price: number
  base_price: number
  discount_value: number
  always_available: boolean
  stock: number
  wholesale_prices: { min_qty: number; price: number }[]
  variants: { name: string; additional_price: number; stock: number }[]
  gift_config: { min_buy: number; gift_product_id: string; qty: number } | null
}

interface ProductFormProps {
  editingProduct: Product | null
  submitting: boolean
  onClose: () => void
  onSave: (productData: any) => Promise<void>
}

interface ToastMessage {
  id: number
  text: string
  type: 'success' | 'error' | 'warning'
}

interface ImageObject {
  file: File | null
  previewUrl: string
  isExisting?: boolean
}

export default function ProductForm({
  editingProduct,
  submitting,
  onClose,
  onSave,
}: ProductFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // State Data Wajib (Required)
  const [productName, setProductName] = useState('')
  const [categoryName, setCategoryName] = useState('Umum')
  const [sku, setSku] = useState('')
  const [basePrice, setBasePrice] = useState<number | ''>('')
  const [alwaysAvailable, setAlwaysAvailable] = useState(false)
  const [stock, setStock] = useState<number | ''>('')
  const [images, setImages] = useState<ImageObject[]>([])

  // State Data Tambahan (Optional)
  const [showOptional, setShowOptional] = useState(false)
  const [capitalPrice, setCapitalPrice] = useState<number>(0)
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [wholesalePrices, setWholesalePrices] = useState<{ min_qty: number; price: number }[]>([])
  const [variants, setVariants] = useState<{ name: string; additional_price: number; stock: number }[]>([])
  const [hasGift, setHasGift] = useState(false)
  const [giftMinBuy, setGiftMinBuy] = useState<number | ''>('')
  const [giftProductId, setGiftProductId] = useState('')
  const [giftQty, setGiftQty] = useState<number | ''>('')

  const showToast = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }

  useEffect(() => {
    if (editingProduct) {
      setProductName(editingProduct.product_name)
      setCategoryName(editingProduct.category_name || 'Umum')
      setSku(editingProduct.sku || '')
      setBasePrice(editingProduct.base_price)
      setCapitalPrice(editingProduct.capital_price || 0)
      setDiscountValue(editingProduct.discount_value || 0)
      setAlwaysAvailable(editingProduct.always_available || false)
      setStock(editingProduct.always_available ? '' : editingProduct.stock)

      const existingImages: ImageObject[] = (editingProduct.main_image_url || []).map((url) => ({
        file: null,
        previewUrl: url,
        isExisting: true,
      }))
      setImages(existingImages)
      setWholesalePrices(editingProduct.wholesale_prices || [])
      setVariants(editingProduct.variants || [])

      if (editingProduct.gift_config) {
        setHasGift(true)
        setGiftMinBuy(editingProduct.gift_config.min_buy ?? '')
        setGiftProductId(editingProduct.gift_config.gift_product_id ?? '')
        setGiftQty(editingProduct.gift_config.qty ?? '')
      } else {
        setHasGift(false)
      }

      if (
        editingProduct.capital_price > 0 ||
        editingProduct.discount_value > 0 ||
        editingProduct.wholesale_prices?.length > 0 ||
        editingProduct.variants?.length > 0 ||
        editingProduct.gift_config
      ) {
        setShowOptional(true)
      }
    }
  }, [editingProduct])

  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (!img.isExisting && img.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(img.previewUrl)
        }
      })
    }
  }, [images])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (images.length >= 5) {
      showToast('Maksimal unggahan adalah 5 foto produk', 'warning')
      return
    }
    const file = files[0]
    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar', 'error')
      return
    }
    const previewUrl = URL.createObjectURL(file)
    setImages([...images, { file, previewUrl, isExisting: false }])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveImage = (indexToRemove: number) => {
    const targetImage = images[indexToRemove]
    if (!targetImage.isExisting && targetImage.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(targetImage.previewUrl)
    }
    setImages(images.filter((_, index) => index !== indexToRemove))
  }

  const uploadAllImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = []
    for (const img of images) {
      if (img.isExisting || !img.file) {
        uploadedUrls.push(img.previewUrl)
        continue
      }
      const fileExt = img.file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, img.file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError
      const {
        data: { publicUrl },
      } = supabase.storage.from('product-images').getPublicUrl(fileName)
      uploadedUrls.push(publicUrl)
    }
    return uploadedUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productName || basePrice === '') {
      showToast('Mohon lengkapi data nama dan harga produk', 'warning')
      return
    }
    if (images.length === 0) {
      showToast('Harap unggah minimal 1 foto produk utama', 'warning')
      return
    }

    setUploadingImage(true)
    try {
      const finalImageUrls = await uploadAllImages()

      const payload = {
        product_name: productName,
        category_name: categoryName,
        sku: sku.trim() || null,
        capital_price: Number(capitalPrice || 0),
        base_price: Number(basePrice),
        always_available: alwaysAvailable,
        stock: alwaysAvailable ? -1 : Number(stock || 0),
        main_image_url: finalImageUrls,
        discount_value: Number(discountValue),
        wholesale_prices: wholesalePrices.filter((w) => w.min_qty && w.price),
        variants: variants
          .filter((v) => v.name)
          .map((v) => ({
            ...v,
            stock: alwaysAvailable ? -1 : Number(v.stock),
          })),
        gift_config:
          hasGift && giftMinBuy && giftProductId
            ? { min_buy: Number(giftMinBuy), gift_product_id: giftProductId, qty: Number(giftQty || 1) }
            : null,
      }

      await onSave(payload)
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Gagal memproses data produk', 'error')
    } finally {
      setUploadingImage(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 md:p-6 w-full relative shadow-xl border border-gray-100 max-h-[85vh] flex flex-col">
      {/* STYLE SCROLLBAR KUSTOM */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>

      {/* CONTAINER TOAST ALERTS */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 space-y-2 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 shadow-md border ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : toast.type === 'warning'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-gray-950 text-white border-gray-800'
            }`}
          >
            <span className="flex-1 pr-2">{toast.text}</span>
            <button
              type="button"
              onClick={() => setToasts((p) => p.filter((t) => t.id !== toast.id))}
              className="text-[9px] uppercase opacity-70 hover:opacity-100 font-black tracking-widest bg-white/10 px-2 py-1 rounded-md transition-all"
            >
              Tutup
            </button>
          </div>
        ))}
      </div>

      {/* HEADER FORM */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
        <div>
          <h3 className="text-base font-extrabold text-gray-950 tracking-tight">
            {editingProduct ? 'Edit Informasi Produk' : 'Tambah Produk Baru'}
          </h3>
          <p className="text-[11px] font-semibold text-gray-400">
            {editingProduct ? 'Perbarui data produk katalog toko Anda' : 'Isi formulir untuk menambahkan produk ke katalog'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-red-600 p-2 rounded-xl hover:bg-gray-50 transition-all active:scale-95 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* BODY FORM DENGAN SCROLLBAR KUSTOM */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 pt-4">
        <div className="overflow-y-auto custom-scrollbar pr-1.5 space-y-5 flex-1">
          {/* DATA WAJIB */}
          <FormRequiredFields
            productName={productName}
            setProductName={setProductName}
            categoryName={categoryName}
            setCategoryName={setCategoryName}
            sku={sku}
            setSku={setSku}
            basePrice={basePrice}
            setBasePrice={setBasePrice}
            alwaysAvailable={alwaysAvailable}
            setAlwaysAvailable={setAlwaysAvailable}
            stock={stock}
            setStock={setStock}
            images={images}
            handleImageUpload={handleImageUpload}
            handleRemoveImage={handleRemoveImage}
            fileInputRef={fileInputRef}
            submitting={submitting}
            uploadingImage={uploadingImage}
          />

          {/* DATA TAMBAHAN EXPANDABLE */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="w-full flex justify-between items-center px-4 py-3 text-[11px] font-bold text-gray-500 bg-gray-50/80 hover:bg-gray-100 border border-gray-200 rounded-xl uppercase tracking-wider transition-all text-left gap-2 group cursor-pointer active:scale-[0.99]"
            >
              <span>{showOptional ? 'Sembunyikan Opsi Lanjutan' : 'Tampilkan Opsi Lanjutan (HPP, Grosir, Diskon, Varian, Gift)'}</span>
              <svg
                className={`w-4 h-4 text-gray-400 group-hover:text-gray-950 transform transition-transform duration-200 ${
                  showOptional ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showOptional && (
              <div className="pt-4 animate-fade-in">
                <FormOptionalFields
                  capitalPrice={capitalPrice}
                  setCapitalPrice={setCapitalPrice}
                  discountValue={discountValue}
                  setDiscountValue={setDiscountValue}
                  wholesalePrices={wholesalePrices}
                  setWholesalePrices={setWholesalePrices}
                  hasGift={hasGift}
                  setHasGift={setHasGift}
                  giftMinBuy={giftMinBuy}
                  setGiftMinBuy={setGiftMinBuy}
                  giftProductId={giftProductId}
                  setGiftProductId={setGiftProductId}
                  giftQty={giftQty}
                  setGiftQty={setGiftQty}
                  variants={variants}
                  setVariants={setVariants}
                  alwaysAvailable={alwaysAvailable}
                />
              </div>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-gray-100 shrink-0 mt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all active:scale-95 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || uploadingImage}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 text-white disabled:text-gray-400 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 shadow-sm hover:shadow cursor-pointer"
          >
            {submitting || uploadingImage ? 'Menyimpan...' : 'Simpan Produk'}
          </button>
        </div>
      </form>
    </div>
  )
}