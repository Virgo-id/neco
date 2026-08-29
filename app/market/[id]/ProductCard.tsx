'use client'

import Image from 'next/image'
import { ShoppingBag, Plus, Minus } from 'lucide-react'

export interface Product {
  id: string
  product_name: string
  base_price: number
  description: string | null
  main_image_url: any
  category_id?: string | null
  is_active?: boolean
}

interface ProductCardProps {
  product: Product
  quantity: number
  onUpdateQuantity: (productId: string, delta: number) => void
  getMediaUrl: (path: string | null, bucket: string) => string | null
  formatRupiah: (amount: number) => string
}

export default function ProductCard({
  product,
  quantity,
  onUpdateQuantity,
  getMediaUrl,
  formatRupiah
}: ProductCardProps) {
  // Helper internal untuk mengekstrak gambar pertama
  const extractFirstImage = (jsonbImage: any): string | null => {
    if (!jsonbImage) return null
    if (typeof jsonbImage === 'string') return jsonbImage
    if (Array.isArray(jsonbImage) && jsonbImage.length > 0) {
      const first = jsonbImage[0]
      if (typeof first === 'string') return first
      if (typeof first === 'object' && first?.url) return first.url
    }
    if (typeof jsonbImage === 'object' && jsonbImage?.url) {
      return jsonbImage.url
    }
    return null
  }

  const productImg = getMediaUrl(
    extractFirstImage(product.main_image_url),
    'product-images'
  )

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-3 flex gap-3 shadow-sm hover:border-red-100 transition-all">
      {/* GAMBAR PRODUK */}
      <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden relative flex-shrink-0">
        {productImg ? (
          <Image
            src={productImg}
            alt={product.product_name}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingBag className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* INFORMASI PRODUK */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-gray-900 text-xs md:text-sm line-clamp-1">
            {product.product_name}
          </h4>
          {product.description && (
            <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5 leading-snug">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="font-black text-xs md:text-sm text-red-600">
            {formatRupiah(product.base_price)}
          </span>

          {/* KONTROL JUMLAH / KERANJANG */}
          {quantity === 0 ? (
            <button
              onClick={() => onUpdateQuantity(product.id, 1)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => onUpdateQuantity(product.id, -1)}
                className="w-5 h-5 rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors shadow-xs"
                title="Kurangi"
              >
                <Minus className="w-2.5 h-2.5 stroke-[3]" />
              </button>
              <span className="text-xs font-bold text-gray-800 w-4 text-center">
                {quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(product.id, 1)}
                className="w-5 h-5 rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors shadow-xs"
                title="Tambah"
              >
                <Plus className="w-2.5 h-2.5 stroke-[3]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}