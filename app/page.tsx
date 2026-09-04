'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Header from '@/app/Header'
import HeroSection from '@/app/HeroSection'
import {
  Store,
  AlertCircle,
  RefreshCw,
  MapPin,
  ShoppingBag,
  Truck,
  Calendar,
  Car,
  UserCheck
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
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath)
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
      if (a.distance !== null) return 1
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
      <Header />
      <HeroSection />

      <main className="w-full px-3 py-4 md:px-4 md:py-6 max-w-7xl mx-auto" id="daftar-toko">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, n) => (
              <div
                key={n}
                className="border border-gray-100 rounded-3xl overflow-hidden animate-pulse p-2"
              >
                <div className="w-full aspect-[4/3] bg-gray-100 rounded-2xl" />
                <div className="p-3 space-y-3">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-16 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : processedMarkets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {processedMarkets.map((market) => {
              const logoUrl = getMediaUrl(market.market_logo_url, 'market-logos')

              return (
                <Link
                  key={market.id}
                  href={`/market/${market.id}`}
                  className="bg-white border border-gray-100 hover:border-red-200 rounded-3xl p-2.5 overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col justify-between group w-full"
                >
                  {/* 1. GAMBAR LOGO TOKO / BANNER */}
                  <div className="w-full aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden relative flex-shrink-0">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={market.market_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          ;(e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <Store className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                  </div>

                  <div className="p-2 pt-3 flex flex-col justify-between flex-1 gap-3">
                    <div className="space-y-2">
                      {/* 2. NAMA TOKO */}
                      <div>
                        <h3 className="font-bold text-gray-900 text-base leading-snug truncate group-hover:text-red-600 transition-colors">
                          {market.market_name}
                        </h3>
                      </div>

                      {/* 3. LAYANAN & JARAK */}
                      <div className="flex items-center justify-between gap-2">
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
                          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-600">
                            <MapPin className="w-2.5 h-2.5 text-red-500 fill-red-500" />
                            {formatDistanceLabel(market.distance)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">
                            -
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4. PRODUK */}
                    <div className="w-full border-t border-gray-100 pt-2 mt-auto">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Produk
                      </p>
                      
                      {market.products && market.products.length > 0 ? (
                        <div className="grid grid-cols-3 gap-1.5">
                          {market.products.map((product) => {
                            const productImg = getMediaUrl(
                              product.image_url,
                              'product-images'
                            )
                            return (
                              <div
                                key={product.id}
                                className="bg-gray-50 rounded-lg p-1 border border-gray-100 flex flex-col items-center text-center gap-1"
                              >
                                {/* KOTAK SEMPURNA (ASPECT-SQUARE) DENGAN SUDUT LENGKUNG (ROUNDED-LG) */}
                                <div className="w-full aspect-square rounded-lg bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                                  {productImg ? (
                                    <img
                                      src={productImg}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <ShoppingBag className="w-3.5 h-3.5 text-gray-300" />
                                  )}
                                </div>
                                <div className="min-w-0 w-full flex flex-col justify-center">
                                  <p className="text-[9px] font-medium text-gray-800 line-clamp-1 w-full">
                                    {product.name}
                                  </p>
                                  <p className="text-[8px] font-bold text-red-600">
                                    {formatRupiah(product.price)}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400 italic">Belum ada produk</p>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bg-[#ffffff] border border-gray-100 rounded-2xl p-12 text-center text-xs md:text-sm font-medium text-gray-400">
            Belum ada toko yang terdaftar saat ini.
          </div>
        )}
      </main>

      <footer className="bg-[#ffffff] max-w-7xl mx-auto mt-12 md:mt-16 py-6 md:py-8 px-4 border-t border-gray-100 text-center">
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