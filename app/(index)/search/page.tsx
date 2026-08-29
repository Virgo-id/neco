'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/utils/supabase'
import { Store, ArrowRight, PackageSearch } from 'lucide-react'
import IndexLayout from '../layout' // <-- Menambahkan import IndexLayout (sesuaikan path jika komponen berada di tempat lain)

interface MarketSearchResult {
  id: string
  market_name: string
  market_logo_url: string | null
  created_at: string
}

function SearchResultsContent() {
  const searchParams = useSearchParams()
  
  const query = searchParams.get('q') || ''
  const type = searchParams.get('type') || 'toko'

  const [markets, setMarkets] = useState<MarketSearchResult[]>([])
  const [loading, setLoading] = useState(true)

  const getLogoUrl = (path: string | null) => {
    if (!path) return null
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    const { data } = supabase.storage.from('market-logos').getPublicUrl(path)
    return data?.publicUrl || null
  }

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim() || type !== 'toko') {
        setMarkets([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('markets')
          .select('id, market_name, market_logo_url, created_at')
          .ilike('market_name', `%${query.trim()}%`)
          .order('market_name', { ascending: true })

        if (error) throw error
        if (data) setMarkets(data)
      } catch (error) {
        console.error('Gagal mengambil hasil pencarian toko:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [query, type])

  return (
    <div className="w-full relative">
      <div className="mb-8 border-b border-gray-100 pb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Hasil Pencarian
        </p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-950 tracking-tighter">
          Menampilkan toko untuk <span className="text-red-600">"{query}"</span>
        </h1>
        {!loading && (
          <p className="text-sm text-gray-600 mt-2">
            Ditemukan {markets.length} toko yang cocok.
          </p>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-50 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : markets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {markets.map((market) => {
            const logoUrl = getLogoUrl(market.market_logo_url)
            return (
              <div 
                key={market.id}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-sm transition-all duration-200 group flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 flex items-center justify-center">
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt={market.market_name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <Store className="w-6 h-6 text-gray-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-gray-950 truncate tracking-tight mb-0.5">
                    {market.market_name}
                  </h2>
                  <p className="text-xs text-gray-500 mb-2.5">
                    Bergabung: {new Date(market.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' })}
                  </p>
                  <Link 
                    href={`/dashboard/${market.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 transition-colors group-hover:gap-2"
                  >
                    Kunjungi Dasbor
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 py-16 px-6 text-center max-w-xl mx-auto mt-12 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100 mb-6">
            <PackageSearch className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-950 tracking-tight">
            Toko tidak ditemukan
          </h3>
          <p className="text-sm text-gray-600 mt-1.5 mb-8 max-w-xs mx-auto">
            Maaf, kami tidak dapat menemukan toko dengan nama <span className="font-semibold text-gray-800">"{query}"</span>.
          </p>
          <Link 
            href="/"
            className="bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm"
          >
            Kembali ke Beranda
          </Link>
        </div>
      )}
    </div>
  )
}

export default function SearchResultsPage() {
  return (
    <IndexLayout>
      <Suspense fallback={
        <div className="w-full py-12 text-center text-sm text-gray-500">
          Memuat halaman pencarian...
        </div>
      }>
        <SearchResultsContent />
      </Suspense>
    </IndexLayout>
  )
}