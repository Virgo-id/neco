'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import MarketList from './components/market-list'
import MarketModal from './components/MarketModal' // Sesuaikan path komponen MarketModal Anda

export default function MyMarketPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [markets, setMarkets] = useState<any[]>([])
  
  // State untuk mengontrol visibilitas dan mode modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null)
  
  const router = useRouter()

  useEffect(() => {
    fetchMarkets()
  }, [])

  const fetchMarkets = async () => {
    try {
      setLoading(true)
      setMessage({ text: '', type: '' })
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      const { data: marketsData, error: dbError } = await supabase
        .from('markets')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (dbError) throw dbError
      setMarkets(marketsData || [])
    } catch (error: any) {
      setMessage({ text: error.message || 'Gagal memuat daftar toko.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // ALUR CREATE: Mengosongkan ID terpilih dan membuka modal
  const handleOpenCreateFlow = () => {
    setSelectedMarketId(null)
    setIsModalOpen(true)
  }

  // ALUR EDIT: Mengisi ID toko yang dipilih dan membuka modal
  const handleOpenEdit = (market: any) => {
    setSelectedMarketId(market.id)
    setIsModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-sm font-semibold text-gray-500 py-12">
        <svg className="animate-spin h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Memuat data toko...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
      {message.text && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-semibold border transition-all ${
          message.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Render Komponen Daftar Toko */}
      <MarketList 
        markets={markets} 
        onOpenCreate={handleOpenCreateFlow} 
        onOpenEdit={handleOpenEdit} 
      />

      {/* Komponen Modal yang dikontrol secara deklaratif */}
      <MarketModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        marketId={selectedMarketId}
        onSuccess={fetchMarkets} // Memperbarui data list secara real-time saat data berhasil disimpan
      />
    </div>
  )
}