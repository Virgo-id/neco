'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Store,
  AlertCircle,
  RefreshCw,
  MapPin,
  ShoppingBag,
  Truck,
  Calendar,
  Car,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ArrowRight // Menambahkan ikon panah untuk tombol Lihat Toko
} from 'lucide-react'
import { supabase } from '@/utils/supabase'

interface ProductDB {
  id: string
  product_name: string
  base_price: number
  main_image_url: any
  is_active?: boolean
}

interface ProductPreview {
  id: string
  name: string
  price: number
  image_url: string | null
}

interface MarketItem {
  id: string
  market_name: string
  market_logo_url: string | null
  market_description: string | null
  market_address: string | null
  market_photos: string[]
  latitude: number | null
  longitude: number | null
  is_pickup_enabled: boolean
  is_delivery_enabled: boolean
  is_order_from_table_enabled: boolean
  is_drivethru_enabled: boolean
  is_dinein_staff_enabled: boolean
  products?: ProductPreview[]
  distance?: number | null
}

interface SupabaseMarketResponse extends Omit<MarketItem, 'products'> {
  products: ProductDB[] | null
}

interface UserLocation {
  latitude: number
  longitude: number
}

// Komponen Pendukung Slider Khusus Mobile & Desktop List
function MarketPhotos({ photos, marketName, getMediaUrl }: { photos: string[], marketName: string, getMediaUrl: any }) {
  const [activeIdx, setActiveIdx] = useState(0)

  if (!photos || photos.length === 0) return null

  const nextPhoto = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveIdx((prev) => (prev + 1) % photos.length)
  }

  const prevPhoto = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveIdx((prev) => (prev - 1 + photos.length) % photos.length)
  }

  return (
    <div className="mt-3 pointer-events-auto">
      {/* TAMPILAN MOBILE: 1 Gambar Berbantuan Panah Navigasi */}
      <div className="relative w-full aspect-[16/10] rounded-xl border border-gray-100 bg-gray-50 overflow-hidden md:hidden flex items-center justify-center">
        {photos.map((photoPath, idx) => {
          const photoUrl = getMediaUrl(photoPath, 'market-photos')
          if (!photoUrl) return null
          return (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-300 ${
                idx === activeIdx ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <Image
                src={photoUrl}
                alt={`Foto ${idx + 1} - ${marketName}`}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          )
        })}

        {photos.length > 1 && (
          <>
            <button
              onClick={prevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center border border-gray-100 text-gray-700 active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center border border-gray-100 text-gray-700 active:scale-95 transition-transform"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            <div className="absolute bottom-2 right-2 z-20 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              {activeIdx + 1}/{photos.length}
            </div>
          </>
        )}
      </div>

      {/* TAMPILAN DESKTOP: Deretan Horizontal (List Asli) */}
      <div className="hidden md:flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin snap-x scroll-smooth">
        {photos.map((photoPath, idx) => {
          const photoUrl = getMediaUrl(photoPath, 'market-photos')
          if (!photoUrl) return null
          return (
            <div
              key={idx}
              className="relative flex-shrink-0 w-52 aspect-[16/10] rounded-xl border border-gray-100 bg-gray-50 overflow-hidden snap-start"
            >
              <Image
                src={photoUrl}
                alt={`Foto ${idx + 1} - ${marketName}`}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function NecoHome() {
  const [mounted, setMounted] = useState(false)
  const [markets, setMarkets] = useState<MarketItem[]>([])
  const [loadingMarkets, setLoadingMarkets] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)

  const getUserLocation = useCallback(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (err) => {
          console.warn('Akses lokasi ditolak atau tidak didukung:', err.message)
        },
        { enableHighAccuracy: true }
      )
    }
  }, [])

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

  const fetchMarkets = useCallback(async () => {
    try {
      setLoadingMarkets(true)
      setError(null)

      const { data, error: dbError } = await supabase
        .from('markets')
        .select(`
          id,
          market_name,
          market_logo_url,
          market_description,
          market_address,
          market_photos,
          latitude,
          longitude,
          is_pickup_enabled,
          is_delivery_enabled,
          is_order_from_table_enabled,
          is_drivethru_enabled,
          is_dinein_staff_enabled,
          products (
            id,
            product_name,
            base_price,
            main_image_url,
            is_active
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (dbError) {
        console.error('Database Error Direct:', dbError)

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('markets')
          .select(`
            id,
            market_name,
            market_logo_url,
            market_description,
            market_address,
            market_photos,
            latitude,
            longitude,
            is_pickup_enabled,
            is_delivery_enabled,
            is_order_from_table_enabled,
            is_drivethru_enabled,
            is_dinein_staff_enabled
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (fallbackError) throw fallbackError

        const formattedFallback: MarketItem[] = (fallbackData || []).map((m: any) => ({
          ...m,
          products: []
        }))
        setMarkets(formattedFallback)
        return
      }

      const rawData = (data as unknown as SupabaseMarketResponse[]) || []

      const formattedData: MarketItem[] = rawData.map((market) => {
        const activeProducts = (market.products || []).filter(
          (p) => p.is_active !== false
        )

        const mappedProducts: ProductPreview[] = activeProducts
          .slice(0, 3)
          .map((p) => ({
            id: p.id,
            name: p.product_name,
            price: Number(p.base_price) || 0,
            image_url: extractFirstImage(p.main_image_url)
          }))

        return {
          ...market,
          market_photos: Array.isArray(market.market_photos) ? market.market_photos : [],
          products: mappedProducts
        }
      })

      setMarkets(formattedData)
    } catch (err: any) {
      const errorMessage =
        err?.message ||
        err?.error_description ||
        (typeof err === 'string' ? err : 'Gagal memuat daftar toko dari database.')

      console.error('Gagal memuat data toko dari Supabase:', errorMessage, err)
      setError(errorMessage)
      setMarkets([])
    } finally {
      setLoadingMarkets(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    getUserLocation()
    fetchMarkets()
  }, [getUserLocation, fetchMarkets])

  const calculateDistanceInKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
    return R * c
  }

  const formatDistanceLabel = (distanceInKm: number): string => {
    if (distanceInKm < 1) {
      return `${Math.round(distanceInKm * 1000)} m`
    }
    return `${distanceInKm.toFixed(1)} km`
  }

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getMediaUrl = (path: string | null, bucket: string) => {
    if (!path) return null
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data?.publicUrl || null
  }

  const processedMarkets = (markets || [])
    .map((market) => {
      if (
        userLocation &&
        market.latitude !== null &&
        market.longitude !== null
      ) {
        const dist = calculateDistanceInKm(
          userLocation.latitude,
          userLocation.longitude,
          Number(market.latitude),
          Number(market.longitude)
        )
        return { ...market, distance: dist }
      }
      return { ...market, distance: null }
    })
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance
      }
      if (a.distance !== null) return -1
      if (b.distance !== null) return 1
      return 0
    })

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#ffffff] flex items-center justify-center text-gray-400 text-sm">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
          <span>Memuat halaman...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ffffff] text-gray-900 font-sans antialiased selection:bg-red-200">
      <main className="w-full px-3 py-4 md:px-4 md:py-6 max-w-6xl mx-auto">
        
        <div className="flex items-center justify-between mb-4 md:mb-5">
          <div>
            <div className="flex items-center gap-1.5 text-gray-900">
              <Store className="w-5 h-5 text-red-600" />
              <h2 className="text-sm md:text-lg font-black tracking-tight uppercase">
                {userLocation ? 'Toko Terdekat' : 'Daftar Toko'}
              </h2>
            </div>
            <p className="text-gray-400 text-[10px] md:text-xs">
              Pilih toko untuk melihat katalog produk lengkap
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-6 flex items-start gap-3 text-xs md:text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Terjadi Kendala</p>
              <p className="text-red-600/90 font-mono text-[11px] mb-3">{error}</p>
              <button
                onClick={fetchMarkets}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
              </button>
            </div>
          </div>
        )}

        {loadingMarkets ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(3)].map((_, n) => (
              <div
                key={n}
                className="border border-gray-100 rounded-2xl p-4 space-y-3 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-32 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : processedMarkets.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {processedMarkets.map((market) => {
              const logoUrl = getMediaUrl(market.market_logo_url, 'market-logos')

              return (
                <div
                  key={market.id}
                  className="bg-white border border-gray-100 hover:border-red-200 rounded-2xl p-4 hover:shadow-md transition-all duration-200 flex flex-col md:flex-row justify-between gap-4 group relative"
                >
                  <Link href={`/market/${market.id}`} className="absolute inset-0 z-0 rounded-2xl" />

                  <div className="flex-1 flex flex-col justify-between space-y-3 z-10 pointer-events-none">
                    <div className="pointer-events-auto w-full">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                          {logoUrl ? (
                            <Image
                              src={logoUrl}
                              alt={market.market_name}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <Store className="w-6 h-6 text-gray-300" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <Link href={`/market/${market.id}`} className="inline-block max-w-full">
                            <h3 className="font-bold text-gray-900 text-sm md:text-base leading-snug truncate group-hover:text-red-600 transition-colors">
                              {market.market_name}
                            </h3>
                          </Link>
                          {market.market_address && (
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">
                              {market.market_address}
                            </p>
                          )}
                        </div>
                      </div>

                      <MarketPhotos 
                        photos={market.market_photos} 
                        marketName={market.market_name} 
                        getMediaUrl={getMediaUrl} 
                      />

                      {market.market_description && (
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mt-2.5">
                          {market.market_description}
                        </p>
                      )}

                      {/* TOMBOL LIHAT TOKO RESPONSIF */}
                      <div className="mt-3.5 block md:hidden pointer-events-auto">
                        <Link 
                          href={`/market/${market.id}`}
                          className="w-full py-2.5 bg-gray-900 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-[0.99]"
                        >
                          Lihat Toko <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-50 flex items-center justify-between gap-2 pointer-events-auto">
                      <div className="flex items-center gap-1">
                        <span title="Pickup">
                          <ShoppingBag
                            className={`w-3.5 h-3.5 p-0.5 rounded border ${
                              market.is_pickup_enabled
                                ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                                : 'text-gray-300 border-gray-100 opacity-30'
                            }`}
                          />
                        </span>
                        <span title="Delivery">
                          <Truck
                            className={`w-3.5 h-3.5 p-0.5 rounded border ${
                              market.is_delivery_enabled
                                ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                                : 'text-gray-300 border-gray-100 opacity-30'
                            }`}
                          />
                        </span>
                        <span title="Order From Table">
                          <Calendar
                            className={`w-3.5 h-3.5 p-0.5 rounded border ${
                              market.is_order_from_table_enabled
                                ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                                : 'text-gray-300 border-gray-100 opacity-30'
                            }`}
                          />
                        </span>
                        <span title="Drive Thru">
                          <Car
                            className={`w-3.5 h-3.5 p-0.5 rounded border ${
                              market.is_drivethru_enabled
                                ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                                : 'text-gray-300 border-gray-100 opacity-30'
                            }`}
                          />
                        </span>
                        <span title="Dine In Staff">
                          <UserCheck
                            className={`w-3.5 h-3.5 p-0.5 rounded border ${
                              market.is_dinein_staff_enabled
                                ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                                : 'text-gray-300 border-gray-100 opacity-30'
                            }`}
                          />
                        </span>
                      </div>

                      {market.distance !== null && market.distance !== undefined ? (
                        <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                          <MapPin className="w-2.5 h-2.5 text-red-500 fill-red-500" />
                          {formatDistanceLabel(market.distance)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">
                          Lokasi tak terjangkau
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CONTAINER PRODUK POPULER & TOMBOL DESKTOP */}
                  <div className="w-full md:w-48 flex-shrink-0 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4 flex flex-col justify-between z-10 pointer-events-auto">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Produk Populer
                      </p>
                      
                      {market.products && market.products.length > 0 ? (
                        <div className="grid grid-cols-3 md:grid-cols-1 gap-2">
                          {market.products.map((product) => {
                            const productImg = getMediaUrl(
                              product.image_url,
                              'product-images'
                            )
                            return (
                              <div
                                key={product.id}
                                className="bg-gray-50 rounded-xl p-1.5 border border-gray-100 flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-1 md:gap-2"
                              >
                                <div className="w-full md:w-10 h-12 md:h-10 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                                  {productImg ? (
                                    <Image
                                      src={productImg}
                                      alt={product.name}
                                      fill
                                      unoptimized
                                      className="object-cover"
                                    />
                                  ) : (
                                    <ShoppingBag className="w-4 h-4 text-gray-300" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 flex flex-col justify-center">
                                  <p className="text-[10px] font-medium text-gray-800 line-clamp-1 w-full">
                                    {product.name}
                                  </p>
                                  <p className="text-[9px] font-bold text-red-600 mt-0.5">
                                    {formatRupiah(product.price)}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic mt-2">Belum ada produk</p>
                      )}
                    </div>

                    {/* TOMBOL DESKTOP LIHAT TOKO */}
                    <div className="hidden md:block mt-4">
                      <Link 
                        href={`/market/${market.id}`}
                        className="w-full py-2 bg-gray-900 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5"
                      >
                        Lihat Toko <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-[#ffffff] border border-gray-100 rounded-2xl p-12 text-center text-xs md:text-sm font-medium text-gray-400">
            Belum ada toko yang terdaftar saat ini.
          </div>
        )}
      </main>

      <footer className="bg-[#ffffff] max-w-6xl mx-auto mt-12 md:mt-16 py-6 md:py-8 px-4 border-t border-gray-100 text-center">
        <p className="text-[10px] md:text-xs text-gray-400 mb-2">
          © 2026 Neco E-Commerce. Aman & Terpercaya.
        </p>
        <div className="flex justify-center gap-4 text-[10px] md:text-xs text-gray-500 font-semibold">
          <Link href="#" className="hover:text-red-600 transition-colors">
            Bantuan 24/7
          </Link>
          <span>•</span>
          <Link href="#" className="hover:text-red-600 transition-colors">
            Syarat & Ketentuan
          </Link>
        </div>
      </footer>
    </div>
  )
}