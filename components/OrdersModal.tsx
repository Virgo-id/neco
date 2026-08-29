'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { 
  X, 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  XCircle, 
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Store
} from 'lucide-react'
import Link from 'next/link'

interface OrdersModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
}

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  price: number
  image_url?: string
}

interface Order {
  id: string
  created_at: string
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled'
  total_amount: number
  market_id?: string
  // Mengakomodasi format Single Object maupun Array yang dikembalikan oleh Supabase
  markets?: { market_name: string } | { market_name: string }[] | null
  order_items?: OrderItem[]
}

export default function OrdersModal({ isOpen, onClose, user }: OrdersModalProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all')

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchOrders()
    }
  }, [isOpen, user])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      // Mengambil data pesanan pengguna dari Supabase beserta detail barang dan informasi toko
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          total_amount,
          market_id,
          markets (
            market_name
          ),
          order_items (
            id,
            product_name,
            quantity,
            price,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setOrders((data as unknown as Order[]) || [])
    } catch (err) {
      console.error('Gagal mengambil data pesanan:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  // Filter berdasarkan status tab
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true
    return order.status === activeTab
  })

  // Helper untuk mendapatkan nama toko secara aman
  const getMarketName = (markets: Order['markets']): string => {
    if (!markets) return 'Toko Neco'
    if (Array.isArray(markets)) {
      return markets[0]?.market_name || 'Toko Neco'
    }
    return markets.market_name || 'Toko Neco'
  }

  // Helper Render Status Badge
  const renderStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
            <Clock className="w-3 h-3" /> Menunggu Pembayaran
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
            <Package className="w-3 h-3" /> Diproses
          </span>
        )
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-600 border border-purple-200">
            <Truck className="w-3 h-3" /> Dalam Pengiriman
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Selesai
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
            <XCircle className="w-3 h-3" /> Dibatalkan
          </span>
        )
      default:
        return null
    }
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER MODAL */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">Pesanan Saya</h2>
              <p className="text-xs text-gray-500 font-medium">Pantau status transaksi dan pengiriman Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB FILTER STATUS */}
        <div className="px-6 py-2 border-b border-gray-100 bg-gray-50/50 flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'pending', label: 'Menunggu' },
            { id: 'processing', label: 'Diproses' },
            { id: 'shipped', label: 'Dikirim' },
            { id: 'completed', label: 'Selesai' },
            { id: 'cancelled', label: 'Dibatalkan' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* KONTEN UTAMA */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="space-y-4 py-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border border-gray-100 rounded-2xl animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-12 bg-gray-100 rounded-xl"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-3">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-gray-800">Belum ada pesanan</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">
                Anda belum melakukan transaksi atau tidak ada transaksi di status ini.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className="border border-gray-100 rounded-2xl p-4 bg-white hover:border-gray-200 transition-all shadow-sm space-y-3"
              >
                {/* HEAD ORDER */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-800 truncate max-w-[150px] sm:max-w-[200px]">
                      {getMarketName(order.markets)}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {new Date(order.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  {renderStatusBadge(order.status)}
                </div>

                {/* ITEMS */}
                <div className="space-y-2">
                  {order.order_items && order.order_items.length > 0 ? (
                    order.order_items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.product_name}
                              className="w-10 h-10 object-cover rounded-lg bg-gray-100 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="truncate">
                            <p className="font-bold text-gray-800 truncate">{item.product_name}</p>
                            <p className="text-[11px] text-gray-500">{item.quantity} x {formatRupiah(item.price)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic">Rincian produk tidak tersedia</p>
                  )}
                </div>

                {/* FOOTER ORDER */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Total Belanja</p>
                    <p className="text-sm font-black text-red-600">{formatRupiah(order.total_amount)}</p>
                  </div>
                  <Link
                    href={`/transactions/${order.id}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 hover:text-red-600 bg-gray-50 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-red-200 transition-colors"
                  >
                    <span>Detail Transaction</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  )
}