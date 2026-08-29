'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  X,
  Trash2,
  ShoppingBag,
  Plus,
  Minus,
  ArrowRight,
  Store,
  ChevronRight,
  ArrowLeft,
  Image as ImageIcon,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image_url?: string
  market_name?: string
  market_id?: string
  market_logo_url?: string // Logo toko/market
  store_logo_url?: string  // Fallback nama property jika ada beda naming
}

interface CartModalProps {
  children?: React.ReactNode
  isOpen?: boolean
  initialMarket?: string | null
  onClose?: () => void
}

// Sub-komponen penanganan gambar (loading, error, unoptimized fallback)
function CartItemImage({ src, alt }: { src?: string; alt: string }) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
  }, [src])

  if (!src || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100">
        <ImageIcon className="w-5 h-5" />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-gray-100">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-300 bg-gray-100 z-10">
          <ImageIcon className="w-5 h-5 animate-pulse" />
        </div>
      )}

      <Image
        src={src}
        alt={alt}
        fill
        sizes="64px"
        unoptimized
        className={`object-cover transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoadingComplete={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
      />
    </div>
  )
}

export default function CartModal({ children, isOpen, initialMarket, onClose }: CartModalProps) {
  const params = useParams()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null)

  const currentUrlMarketId = (initialMarket || params?.id_market || params?.market_id) as
    | string
    | undefined

  const { groupedCart, marketNames, marketLogos } = useMemo(() => {
    const grouped: Record<string, CartItem[]> = {}
    const names: Record<string, string> = {}
    const logos: Record<string, string | undefined> = {}

    cartItems.forEach((item) => {
      const marketKey = item.market_id || item.market_name || 'unknown_market'
      const name = item.market_name || 'Toko Lainnya'
      const logo = item.market_logo_url || item.store_logo_url

      if (!grouped[marketKey]) {
        grouped[marketKey] = []
        names[marketKey] = name
        logos[marketKey] = logo
      } else if (!logos[marketKey] && logo) {
        // Jika sebelumnya belum dapat logo tapi item ini punya logo, perbarui
        logos[marketKey] = logo
      }

      grouped[marketKey].push(item)
    })

    return { groupedCart: grouped, marketNames: names, marketLogos: logos }
  }, [cartItems])

  const loadCartFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem('resta-cart-storage')
      if (stored) {
        const parsedItems: CartItem[] = JSON.parse(stored)
        setCartItems(parsedItems)
      } else {
        setCartItems([])
      }
    } catch (error) {
      console.error('Gagal memuat keranjang:', error)
      setCartItems([])
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'
    loadCartFromStorage()

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, loadCartFromStorage])

  useEffect(() => {
    if (!isOpen) return

    if (currentUrlMarketId && cartItems.length > 0) {
      const matchedItem = cartItems.find(
        (item) =>
          String(item.market_id).toLowerCase() === String(currentUrlMarketId).toLowerCase() ||
          String(item.market_name).toLowerCase() === String(currentUrlMarketId).toLowerCase()
      )

      if (matchedItem) {
        const targetKey = matchedItem.market_id || matchedItem.market_name || 'unknown_market'
        setSelectedMarketId(targetKey)
      } else {
        setSelectedMarketId(null)
      }
    } else {
      setSelectedMarketId(null)
    }
  }, [isOpen, currentUrlMarketId, cartItems])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleCartUpdate = () => loadCartFromStorage()
    window.addEventListener('cart-updated', handleCartUpdate)
    window.addEventListener('storage', handleCartUpdate)

    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate)
      window.removeEventListener('storage', handleCartUpdate)
    }
  }, [loadCartFromStorage])

  const saveCartData = (updatedItems: CartItem[]) => {
    setCartItems(updatedItems)
    localStorage.setItem('resta-cart-storage', JSON.stringify(updatedItems))
    window.dispatchEvent(new Event('cart-updated'))
  }

  const updateQuantity = (id: string, delta: number) => {
    const updated = cartItems
      .map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta
          return newQty > 0 ? { ...item, quantity: newQty } : null
        }
        return item
      })
      .filter(Boolean) as CartItem[]

    saveCartData(updated)
  }

  const removeItem = (id: string) => {
    const updated = cartItems.filter((item) => item.id !== id)
    saveCartData(updated)
  }

  const selectedMarketItems = selectedMarketId ? groupedCart[selectedMarketId] || [] : []
  const selectedMarketName = selectedMarketId ? marketNames[selectedMarketId] || 'Toko' : null

  const totalAllPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalMarketPrice = selectedMarketItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10 animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header Modal */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {selectedMarketId ? (
              <button
                onClick={() => setSelectedMarketId(null)}
                className="p-1 -ml-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Kembali ke daftar toko"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <ShoppingBag className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <h2 className="text-base font-bold text-gray-900 truncate max-w-[200px] sm:max-w-xs">
              {selectedMarketName ? selectedMarketName : 'Keranjang Belanja'}
            </h2>
            <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full shrink-0">
              {selectedMarketId
                ? selectedMarketItems.reduce((acc, i) => acc + i.quantity, 0)
                : cartItems.reduce((acc, i) => acc + i.quantity, 0)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer shrink-0"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
          {children}

          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-3">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-gray-800">Keranjangmu Masih Kosong</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                Pilih produk favoritmu dan tambahkan ke keranjang.
              </p>
            </div>
          ) : !selectedMarketId ? (
            /* DAFTAR TOKO */
            <div className="space-y-2.5">
              <p className="text-xs text-gray-400 font-medium mb-1">
                Pilih toko untuk melihat isi produk:
              </p>
              {Object.entries(groupedCart).map(([mId, items]) => {
                const marketName = marketNames[mId] || 'Toko Lainnya'
                const marketLogo = marketLogos[mId]
                const totalItemsInMarket = items.reduce((acc, i) => acc + i.quantity, 0)
                const marketSubtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

                return (
                  <button
                    key={mId}
                    onClick={() => setSelectedMarketId(mId)}
                    className="w-full flex items-center justify-between p-3.5 border border-gray-100 bg-gray-50/50 hover:bg-red-50/30 hover:border-red-200 rounded-2xl transition-all cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Logo Toko / Fallback Icon */}
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-gray-100 bg-white shrink-0 flex items-center justify-center">
                        {marketLogo ? (
                          <CartItemImage src={marketLogo} alt={marketName} />
                        ) : (
                          <div className="p-2 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors w-full h-full flex items-center justify-center">
                            <Store className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate group-hover:text-red-600 transition-colors">
                          {marketName}
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {totalItemsInMarket} Produk •{' '}
                          <span className="font-semibold text-gray-700">
                            Rp {marketSubtotal.toLocaleString('id-ID')}
                          </span>
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                )
              })}
            </div>
          ) : (
            /* DETAIL PRODUK TOKO TERPILIH */
            <div className="space-y-3">
              {selectedMarketItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 border border-gray-100 rounded-xl bg-white shadow-xs hover:border-gray-200 transition-colors"
                >
                  {/* Container Gambar Produk */}
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                    <CartItemImage src={item.image_url} alt={item.name} />
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                      <p className="text-xs font-bold text-red-600 mt-0.5">
                        Rp {item.price?.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-gray-800 min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                        title="Hapus item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Checkout */}
        {cartItems.length > 0 && (!selectedMarketId || selectedMarketItems.length > 0) && (
          <div className="p-4 border-t border-gray-100 bg-white space-y-3 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-semibold">
                {selectedMarketName ? `Subtotal ${selectedMarketName}` : 'Total Semua Toko'}
              </span>
              <span className="text-base font-bold text-red-600">
                Rp {(selectedMarketId ? totalMarketPrice : totalAllPrice).toLocaleString('id-ID')}
              </span>
            </div>

            <Link
              href={selectedMarketId ? `/checkout?market_id=${selectedMarketId}` : '/checkout'}
              onClick={onClose}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer"
            >
              <span>Lanjut ke Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}