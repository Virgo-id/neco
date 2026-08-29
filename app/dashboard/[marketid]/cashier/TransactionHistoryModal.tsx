'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

interface Transaction {
  id: string
  created_at: string
  total_price: number
  status: string
  // Anda bisa menambahkan relasi item jika ada tabel transaction_items
}

interface TransactionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  marketId: string
}

export default function TransactionHistoryModal({
  isOpen,
  onClose,
  marketId,
}: TransactionHistoryModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDate, setFilterDate] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchTransactions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, marketId, filterDate])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('transactions')
        .select('id, created_at, total_price, status')
        .eq('market_id', marketId)
        .order('created_at', { ascending: false })

      // Filter berdasarkan tanggal jika dipilih
      if (filterDate) {
        const startOfDay = `${filterDate}T00:00:00.000Z`
        const endOfDay = `${filterDate}T23:59:59.999Z`
        query = query.gte('created_at', startOfDay).lte('created_at', endOfDay)
      }

      const { data, error } = await query

      if (error) throw error
      setTransactions(data || [])
    } catch (err: any) {
      console.error('Gagal mengambil riwayat transaksi:', err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter pencarian lokal berdasarkan ID transaksi di client-side
  const filteredTransactions = transactions.filter((tx) =>
    tx.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handlePrintReceipt = (tx: Transaction) => {
    // Logika cetak struk sederhana (bisa disesuaikan dengan printer thermal)
    alert(`Mencetak struk untuk Transaksi ID: ${tx.id}\nTotal: Rp ${tx.total_price.toLocaleString('id-ID')}`)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* HEADER MODAL */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-base font-black text-gray-900">Riwayat Transaksi</h3>
            <p className="text-xs text-gray-500 font-medium">Daftar penjualan toko Anda</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* FILTER BAR */}
        <div className="p-4 border-b border-gray-100 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
          {/* Pencarian ID */}
          <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center gap-2 border border-transparent focus-within:border-gray-200">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari ID Transaksi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none w-full text-gray-900"
            />
          </div>

          {/* Filter Tanggal */}
          <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center gap-2 border border-transparent focus-within:border-gray-200">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none w-full text-gray-900"
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate('')} 
                className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* KONTEN UTAMA / TABEL */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400 text-xs text-center py-8">
              <span>Tidak ada transaksi yang ditemukan.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => {
                const date = new Date(tx.created_at).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })

                return (
                  <div
                    key={tx.id}
                    className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-sm transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-gray-950">
                          #{tx.id.substring(0, 8).toUpperCase()}...
                        </span>
                        <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium">{date}</p>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-50">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total</span>
                        <span className="text-sm font-black text-gray-950">
                          Rp {tx.total_price.toLocaleString('id-ID')}
                        </span>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handlePrintReceipt(tx)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Cetak Struk
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center text-xs text-gray-500 font-bold shrink-0">
          <span>Menampilkan {filteredTransactions.length} Transaksi</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  )
}