'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/utils/supabase'

interface Order {
  id: string
  created_at: string
  customer_name: string
  customer_phone?: string
  delivery_address: string
  shipping_cost: number
  total_price: number
  status: 'pending' | 'preparing' | 'on_delivery' | 'completed' | 'cancelled'
  notes?: string
  order_items: {
    id: string
    product_name: string
    quantity: number
  }[]
}

export default function OrderDeliveryPage({
  params,
}: {
  params: Promise<{ marketid: string }>
}) {
  const { marketid } = use(params)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchDeliveryOrders()

    // ─── SUPABASE REALTIME SUBSCRIPTION ───
    const channel = supabase
      .channel(`realtime-delivery-orders-${marketid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `market_id=eq.${marketid}`,
        },
        () => {
          fetchDeliveryOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [marketid])

  const fetchDeliveryOrders = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, created_at, customer_name, customer_phone, delivery_address, 
          shipping_cost, total_price, status, notes,
          order_items (id, product_name, quantity)
        `)
        .eq('market_id', marketid)
        .eq('method', 'delivery')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Gagal memuat pesanan delivery:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // Tambah konfirmasi jika menolak/membatalkan pesanan
    if (newStatus === 'cancelled') {
      const confirmCancel = window.confirm('Apakah Anda yakin ingin menolak / membatalkan pesanan ini?')
      if (!confirmCancel) return
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o))
    } catch (err) {
      alert('Gagal memperbarui status pengiriman')
      console.error(err)
    }
  }

  // Fungsi Copy to Clipboard dengan feedback visual
  const handleCopyText = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(idKey)
    setTimeout(() => {
      setCopiedId(null)
    }, 2000)
  }

  // Filter gabungan (Tab Status & Query Pencarian)
  const filteredOrders = orders.filter(order => {
    const matchesFilter = activeFilter === 'all' || order.status === activeFilter
    const query = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !query ||
      order.customer_name.toLowerCase().includes(query) ||
      (order.customer_phone && order.customer_phone.toLowerCase().includes(query)) ||
      order.delivery_address.toLowerCase().includes(query) ||
      order.id.toLowerCase().includes(query)

    return matchesFilter && matchesSearch
  })

  const statusTabs = [
    { id: 'all', name: 'Semua' },
    { id: 'pending', name: 'Pesanan Baru' },
    { id: 'preparing', name: 'Disiapkan' },
    { id: 'on_delivery', name: 'Kurir Jalan' },
    { id: 'completed', name: 'Selesai' },
    { id: 'cancelled', name: 'Dibatalkan' },
  ]

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-gray-950 tracking-tight">Order Delivery</h2>
          <p className="text-xs font-medium text-gray-500 mt-0.5 sm:mt-1">
            Kelola pesanan antar-alamat, penugasan kurir, dan pantau status pengiriman.
          </p>
        </div>
        <div className="text-[11px] sm:text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl self-start sm:self-center flex items-center gap-1.5 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-600"></span> Live Logistik
        </div>
      </div>

      {/* Input Pencarian & Filter Tabs */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pelanggan, telp, alamat, atau ID order..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                activeFilter === tab.id
                  ? 'bg-gray-950 border-gray-950 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading && orders.length === 0 ? (
        <div className="min-h-[250px] flex flex-col items-center justify-center gap-2 text-sm font-semibold text-gray-500 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <svg className="animate-spin h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Sinkronisasi data pengiriman...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="min-h-[250px] flex flex-col items-center justify-center text-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="text-sm font-bold text-gray-900">Antrean pengiriman kosong</h3>
          <p className="text-xs text-gray-400 mt-1">Tidak ada pesanan delivery terdeteksi untuk kriteria ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row justify-between gap-4 lg:gap-6">
              
              {/* Sektor Kiri: Meta Data & Alamat Kirim */}
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-lg">
                    <span className="text-xs font-black text-gray-800">
                      DELIVERY #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <button
                      onClick={() => handleCopyText(order.id, `id-${order.id}`)}
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                      title="Salin ID Pesanan"
                    >
                      {copiedId === `id-${order.id}` ? (
                        <span className="text-[10px] font-bold text-emerald-600">Tersalin!</span>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'on_delivery' ? 'bg-indigo-100 text-indigo-800' :
                    order.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {order.status === 'pending' ? 'Baru' : order.status === 'preparing' ? 'Dapur' : order.status === 'on_delivery' ? 'Di Jalan' : order.status === 'completed' ? 'Selesai' : 'Batal'}
                  </span>
                  
                  <span className="text-[11px] font-bold text-gray-400 ml-auto sm:ml-0">
                    {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Penerima */}
                  <div>
                    <h4 className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-wider">Penerima</h4>
                    <p className="text-xs sm:text-sm font-black text-gray-900 mt-0.5">{order.customer_name}</p>
                    {order.customer_phone && <p className="text-xs font-bold text-gray-500">{order.customer_phone}</p>}
                  </div>

                  {/* Lokasi Tujuan + Tombol Copy */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-wider">Alamat Tujuan</h4>
                      <button
                        onClick={() => handleCopyText(order.delivery_address, `addr-${order.id}`)}
                        className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-0.5"
                      >
                        {copiedId === `addr-${order.id}` ? (
                          <span className="text-[10px] text-emerald-600 font-bold">Tersalin!</span>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[10px]">Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs font-bold text-gray-700 mt-0.5 line-clamp-2" title={order.delivery_address}>
                      {order.delivery_address}
                    </p>
                  </div>
                </div>

                {/* Ringkasan Item belanja */}
                <div className="border-t border-gray-100 pt-3">
                  <h4 className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Item Pesanan</h4>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {order.order_items?.map((item) => (
                      <span key={item.id} className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-xl">
                        {item.product_name} <span className="text-red-600 font-black">x{item.quantity}</span>
                      </span>
                    ))}
                  </div>
                  {order.notes && (
                    <p className="text-[11px] text-amber-700 bg-amber-50/50 border border-amber-100 px-2.5 py-1.5 rounded-xl mt-2 font-medium">
                      <span className="font-bold">Catatan Driver:</span> {order.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Sektor Kanan: Total & Kontrol Alur Distribusi */}
              <div className="flex flex-col sm:flex-row lg:flex-col justify-between items-start sm:items-center lg:items-end border-t lg:border-t-0 lg:border-l border-gray-100 pt-3 lg:pt-0 lg:pl-6 gap-3 min-w-[200px]">
                <div className="w-full sm:w-auto lg:text-right space-y-0.5 flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end">
                  <div className="text-[11px] font-bold text-gray-400">
                    <span>Ongkir: {formatIDR(order.shipping_cost)}</span>
                  </div>
                  <div className="text-right sm:text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider leading-none">Total Pembayaran</p>
                    <p className="text-base sm:text-lg font-black text-red-600">{formatIDR(order.total_price)}</p>
                  </div>
                </div>

                {/* Tombol Manajemen & Tolak Order */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                  {/* Tombol Tolak / Batalkan Pesanan (Hanya untuk order yang belum selesai/dibatalkan) */}
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black rounded-xl border border-red-200 transition-all flex-1 sm:flex-none text-center"
                    >
                      Tolak Order
                    </button>
                  )}

                  {/* Workflow Tombol Status */}
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-sm flex-1 sm:flex-none text-center"
                    >
                      Proses Dapur
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'on_delivery')}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-sm flex-1 sm:flex-none text-center"
                    >
                      Serahkan Kurir
                    </button>
                  )}
                  {order.status === 'on_delivery' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-sm flex-1 sm:flex-none text-center"
                    >
                      Selesai / Diterima
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}