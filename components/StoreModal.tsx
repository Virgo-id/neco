'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/utils/supabase'
import { X } from 'lucide-react'

import MarketList from '@/components/market/market-list'
import MarketModal from '@/components/market/MarketModal'

interface StoreModalProps {
  isOpen: boolean
  onClose: () => void
  user?: any
  userMarkets?: any[]
}

export default function StoreModal({ isOpen, onClose, user, userMarkets }: StoreModalProps) {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [markets, setMarkets] = useState<any[]>([])

  const [isInnerModalOpen, setIsInnerModalOpen] = useState(false)
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null)

  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true)
      setMessage({ text: '', type: '' })

      // Fallback: Ambil ID user dari prop 'user' atau langsung cek sesi Supabase
      let currentUserId = user?.id

      if (!currentUserId) {
        const { data: authData } = await supabase.auth.getUser()
        currentUserId = authData?.user?.id
      }

      if (!currentUserId) {
        // Jika tidak ada user ID tetapi prop userMarkets dikirim dari luar, gunakan data tersebut
        if (userMarkets && userMarkets.length > 0) {
          setMarkets(userMarkets)
          setLoading(false)
          return
        }

        setMessage({ 
          text: 'Sesi pengguna tidak ditemukan. Silakan login kembali.', 
          type: 'error' 
        })
        setLoading(false)
        return
      }

      const { data: marketsData, error: dbError } = await supabase
        .from('markets')
        .select('*')
        .eq('owner_id', currentUserId)
        .order('created_at', { ascending: false })

      if (dbError) throw dbError
      setMarkets(marketsData || [])
    } catch (error: any) {
      setMessage({ 
        text: error.message || 'Gagal memuat daftar toko.', 
        type: 'error' 
      })
    } finally {
      setLoading(false)
    }
  }, [user, userMarkets])

  useEffect(() => {
    if (isOpen) {
      fetchMarkets()
    }
  }, [isOpen, fetchMarkets])

  const handleOpenCreateFlow = () => {
    setSelectedMarketId(null)
    setIsInnerModalOpen(true)
  }

  const handleOpenEdit = (market: any) => {
    setSelectedMarketId(market.id)
    setIsInnerModalOpen(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">Kelola Toko Saya</h2>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {message.text && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-semibold border transition-all ${
              message.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
            }`}>
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 text-sm font-semibold text-gray-500 py-12">
              <svg className="animate-spin h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Memuat data toko...</span>
            </div>
          ) : (
            <MarketList 
              markets={markets} 
              onOpenCreate={handleOpenCreateFlow} 
              onOpenEdit={handleOpenEdit} 
            />
          )}
        </div>

      </div>

      <MarketModal 
        isOpen={isInnerModalOpen}
        onClose={() => setIsInnerModalOpen(false)}
        marketId={selectedMarketId}
        onSuccess={() => {
          fetchMarkets()
        }}
      />
    </div>
  )
}