'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Store,
  MapPin,
  ShoppingBag,
  Truck,
  Calendar,
  Car,
  UserCheck,
  Search,
  ShoppingCart,
  AlertCircle,
  RefreshCw,
  Info,
  Phone,
  Mail,
  ExternalLink,
  Tag,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { supabase } from '@/utils/supabase'
import ProductCard, { Product } from './ProductCard'
import CartModal from './CartModal'

export interface MarketDetail {
  id: string
  owner_id: string
  market_name: string
  market_username: string
  market_description: string | null
  market_logo_url: string | null
  market_photos: string[] | null
  market_phone: string
  market_email: string | null
  market_address: string
  market_regency: string | null
  latitude: number
  longitude: number
  maps_url: string | null
  is_pickup_enabled: boolean
  is_delivery_enabled: boolean
  is_order_from_table_enabled: boolean
  is_drivethru_enabled: boolean
  is_dinein_staff_enabled: boolean
  market_type: string
  is_active: boolean
  created_at: string
  updated_at: string
  market_wallet: number
}

export default function MarketDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const marketId = resolvedParams.id

  const [mounted, setMounted] = useState(false)
  const [market, setMarket] = useState<MarketDetail | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State Fitur Menyalin Nomor Telepon & Modal Preview Galeri
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  // Filters & State Keranjang
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const getMediaUrl = (path: string | null, bucket: string) => {
    if (!path) return null
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data?.publicUrl || null
  }

  const fetchMarketDetail = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch detail toko lengkap
      const { data: marketData, error: marketErr } = await supabase
        .from('markets')
        .select('*')
        .eq('id', marketId)
        .single()

      if (marketErr) throw marketErr
      if (!marketData) throw new Error('Toko tidak ditemukan.')

      setMarket(marketData as MarketDetail)

      // Fetch produk toko
      const { data: productData, error: productErr } = await supabase
        .from('products')
        .select('*')
        .eq('market_id', marketId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (productErr) throw productErr

      setProducts(productData || [])
    } catch (err: any) {
      console.error('Gagal mengambil data toko:', err)
      setError(err?.message || 'Gagal memuat detail toko.')
    } finally {
      setLoading(false)
    }
  }, [marketId])

  useEffect(() => {
    setMounted(true)
    fetchMarketDetail()
  }, [fetchMarketDetail])

  // Menyalin Nomor Telepon ke Clipboard
  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone)
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 2000)
    } catch (err) {
      console.error('Gagal menyalin nomor:', err)
    }
  }

  // Pengelolaan Keranjang Belanja
  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const currentQty = prev[productId] || 0
      const newQty = currentQty + delta
      if (newQty <= 0) {
        const copy = { ...prev }
        delete copy[productId]
        if (Object.keys(copy).length === 0) {
          setIsCartOpen(false)
        }
        return copy
      }
      return { ...prev, [productId]: newQty }
    })
  }

  const clearCart = () => {
    setCart({})
    setIsCartOpen(false)
  }

  const totalCartItems = Object.values(cart).reduce((a, b) => a + b, 0)
  const totalCartPrice = products.reduce((acc, prod) => {
    const qty = cart[prod.id] || 0
    return acc + qty * (prod.base_price || 0)
  }, 0)

  // Trigger animasi letupan kilat (100ms)
  useEffect(() => {
    if (totalCartItems === 0) return
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 100)
    return () => clearTimeout(timer)
  }, [totalCartItems])

  const cartProducts = products.filter((p) => (cart[p.id] || 0) > 0)

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const filteredProducts = products.filter((p) =>
    p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-gray-400 text-sm">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-red-600" />
          <span>Memuat informasi toko...</span>
        </div>
      </div>
    )
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-white p-6 max-w-md mx-auto flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-gray-900 mb-1">Terjadi Kesalahan</h2>
        <p className="text-xs text-gray-500 mb-6">{error || 'Toko tidak ditemukan.'}</p>
        <Link
          href="/"
          className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>
      </div>
    )
  }

  const logoUrl = getMediaUrl(market.market_logo_url, 'market-logos')

  const servicesList = [
    { label: 'Ambil Sendiri', enabled: market.is_pickup_enabled, icon: ShoppingBag },
    { label: 'Layanan Antar', enabled: market.is_delivery_enabled, icon: Truck },
    { label: 'Pesan di Meja', enabled: market.is_order_from_table_enabled, icon: Calendar },
    { label: 'Drive-Thru', enabled: market.is_drivethru_enabled, icon: Car },
    { label: 'Dine-In Staff', enabled: market.is_dinein_staff_enabled, icon: UserCheck }
  ]

  const galleryPhotos = market.market_photos || []

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24">
      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-5">
        {/* PROFIL TOKO LENGKAP */}
        <section className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm space-y-4">
          {/* BARIS TOMBOL KEMBALI & USERNAME TOKO */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-50">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-xl transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </Link>
            <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
              @{market.market_username}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 relative flex items-center justify-center">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={market.market_name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <Store className="w-10 h-10 text-gray-300" />
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-black text-gray-900 leading-tight">
                  {market.market_name}
                </h1>
                <span className="bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Tag className="w-3 h-3" /> {market.market_type}
                </span>
              </div>

              {market.market_address && (
                <p className="text-xs text-gray-500 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>
                    {market.market_address}
                    {market.market_regency ? `, ${market.market_regency}` : ''}
                  </span>
                </p>
              )}

              {market.market_description && (
                <p className="text-xs text-gray-600 leading-relaxed pt-1">
                  {market.market_description}
                </p>
              )}
            </div>
          </div>

          {/* FOTO-FOTO SUASANA TOKO (DAPAT DIKLIK & INTERAKTIF) */}
          {galleryPhotos.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Galeri Toko (Klik untuk memperbesar)
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {galleryPhotos.map((photo, idx) => {
                  const photoUrl = getMediaUrl(photo, 'market-photos')
                  if (!photoUrl) return null
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className="w-28 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 relative border border-gray-100 hover:opacity-90 active:scale-95 transition-all focus:outline-none cursor-pointer group"
                    >
                      <Image
                        src={photoUrl}
                        alt={`Foto Toko ${idx + 1}`}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* AKSI KONTAK (KLIK UNTUK MENYALIN NOMOR TELEPON) & MAPS */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-50 flex-wrap text-xs">
            {market.market_phone && (
              <button
                type="button"
                onClick={() => handleCopyPhone(market.market_phone)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 active:bg-emerald-50 text-gray-700 font-semibold rounded-xl transition-colors border border-gray-100 cursor-pointer"
                title="Klik untuk menyalin nomor telepon"
              >
                {copiedPhone ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{market.market_phone}</span>
                    <Copy className="w-3 h-3 text-gray-400 ml-1" />
                  </>
                )}
              </button>
            )}

            {market.market_email && (
              <a
                href={`mailto:${market.market_email}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-colors border border-gray-100"
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Email</span>
              </a>
            )}

            {market.maps_url ? (
              <a
                href={market.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-colors border border-gray-100 ml-auto"
              >
                <ExternalLink className="w-3.5 h-3.5 text-red-600" />
                <span>Buka Maps</span>
              </a>
            ) : market.latitude && market.longitude ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${market.latitude},${market.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-colors border border-gray-100 ml-auto"
              >
                <ExternalLink className="w-3.5 h-3.5 text-red-600" />
                <span>Buka Maps</span>
              </a>
            ) : null}
          </div>

          {/* STATUS LAYANAN PEMESANAN TOKO */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
              Layanan Pemesanan
            </p>
            <div className="flex flex-wrap gap-2">
              {servicesList.map((service, index) => {
                const IconComponent = service.icon
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                      service.enabled
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-gray-50 text-gray-400 border-gray-200 opacity-60'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{service.label}</span>
                    {service.enabled ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-0.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* PENCARIAN & DOKUMEN PRODUK */}
        <section className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari menu atau produk di toko ini..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-red-500 transition-colors shadow-sm"
            />
          </div>

          {/* LIST PRODUK */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Daftar Menu ({filteredProducts.length})
            </h3>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    quantity={cart[product.id] || 0}
                    onUpdateQuantity={updateQuantity}
                    getMediaUrl={getMediaUrl}
                    formatRupiah={formatRupiah}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-medium">
                  Tidak ada produk yang ditemukan.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* STICKY FLOATING CART BAR */}
      {totalCartItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-xl mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className={`w-full bg-red-600 hover:bg-red-700 text-white rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-3 transition-transform duration-75 ease-out cursor-pointer active:scale-95 ${
              isAnimating ? 'scale-[1.04]' : 'scale-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative bg-white/20 p-2 rounded-xl">
                <ShoppingCart className="w-5 h-5 text-white" />
                <span
                  className={`absolute -top-1.5 -right-1.5 bg-white text-red-600 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center transition-transform duration-75 ${
                    isAnimating ? 'scale-150' : 'scale-100'
                  }`}
                >
                  {totalCartItems}
                </span>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-red-100 uppercase tracking-wider font-semibold">
                  Lihat Keranjang
                </p>
                <p className="text-sm md:text-base font-black">
                  {formatRupiah(totalCartPrice)}
                </p>
              </div>
            </div>

            <div className="bg-white text-red-600 font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm">
              Buka Keranjang ({totalCartItems})
            </div>
          </button>
        </div>
      )}

      {/* MODAL LIGHTBOX / FULLSCREEN PREVIEW FOTO GALERI */}
      {selectedImageIndex !== null && galleryPhotos[selectedImageIndex] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
          {/* Tombol Tutup */}
          <button
            onClick={() => setSelectedImageIndex(null)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors z-10 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigasi Kiri */}
          {galleryPhotos.length > 1 && (
            <button
              onClick={() =>
                setSelectedImageIndex((prev) =>
                  prev !== null && prev > 0 ? prev - 1 : galleryPhotos.length - 1
                )
              }
              className="absolute left-3 md:left-6 bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-full transition-colors z-10 cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Kontainer Gambar Utama */}
          <div className="relative w-full max-w-3xl h-[70vh] flex items-center justify-center">
            <Image
              src={
                getMediaUrl(galleryPhotos[selectedImageIndex], 'market-photos') || ''
              }
              alt={`Galeri ${selectedImageIndex + 1}`}
              fill
              unoptimized
              className="object-contain"
            />
          </div>

          {/* Navigasi Kanan */}
          {galleryPhotos.length > 1 && (
            <button
              onClick={() =>
                setSelectedImageIndex((prev) =>
                  prev !== null && prev < galleryPhotos.length - 1 ? prev + 1 : 0
                )
              }
              className="absolute right-3 md:right-6 bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-full transition-colors z-10 cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Indikator Urutan Foto */}
          <div className="absolute bottom-6 bg-black/50 text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
            {selectedImageIndex + 1} / {galleryPhotos.length}
          </div>
        </div>
      )}

      {/* MODAL KERANJANG BELANJA */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        marketName={market.market_name}
        cartProducts={cartProducts}
        cart={cart}
        totalCartItems={totalCartItems}
        totalCartPrice={totalCartPrice}
        onUpdateQuantity={updateQuantity}
        onClearCart={clearCart}
        getMediaUrl={getMediaUrl}
        formatRupiah={formatRupiah}
      />
    </div>
  )
}