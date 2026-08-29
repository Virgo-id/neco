'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/utils/supabase'

interface Order {
  id: string
  created_at: string
  customer_name: string
  customer_phone?: string
  total_price: number
  status: 'pending' | 'processing' | 'ready' | 'completed' | 'cancelled'
  order_items: {
    id: string
    product_name: string
    quantity: number
    notes?: string
  }[]
}

export default function OrderPickupPage({
  params,
}: {
  params: Promise<{ marketid: string }>
}) {
  const { marketid } = use(params)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [activeFilter, setActiveFilter] = useState<string>('all')

  useEffect(() => {
    fetchOrders()

    // ─── SUPABASE REALTIME FOR ORDERS ───
    const channel = supabase
      .channel(`realtime-pickup-orders-${marketid}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Dengarkan INSERT, UPDATE, dan DELETE
          schema: 'public',
          table: 'orders',
          filter: `market_id=eq.${marketid}`, // sesuaikan nama kolom market_id di DB Anda
        },
        () => {
          // Ambil ulang data dari server untuk memastikan relasi order_items ikut ter-fetch dengan benar
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketid])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      // Mengambil data order khusus metode 'pickup'
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, created_at, customer_name, customer_phone, total_price, status,
          order_items (id, product_name, quantity, notes)
        `)
        .eq('market_id', marketid)
        .eq('method', 'pickup') // Memastikan hanya mengambil data pickup
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Gagal memuat pesanan pickup:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
      // State otomatis terupdate via realtime subscription, 
      // tetapi panggil lokal jika ingin feedback instan alternatif:
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o))
    } catch (err) {
      alert('Gagal memperbarui status pesanan')
      console.error(err)
    }
  }

  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'all') return true
    return order.status === activeFilter
  })

  const statusTabs = [
    { id: 'all', name: 'Semua' },
    { id: 'pending', name: 'Baru Masuk' },
    { id: 'processing', name: 'Diproses' },
    { id: 'ready', name: 'Siap Diambil' },
    { id: 'completed', name: 'Selesai' },
  ]

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-gray-950 tracking-tight">Order Pickup</h2>
          <p className="text-xs font-medium text-gray-500 mt-1">Kelola dan pantau pesanan take-away / pickup pelanggan secara realtime.</p>
        </div>
        <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl self-start sm:self-center flex items-center gap-1.5 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-600"></span> Live Monitoring
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap border ${
              activeFilter === tab.id
                ? 'bg-gray-950 border-gray-950 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading && orders.length === 0 ? (
        <div className="min-h-[250px] flex flex-col items-center justify-center gap-2 text-sm font-semibold text-gray-500 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <svg className="animate-spin h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Memuat data pesanan...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="min-h-[250px] flex flex-col items-center justify-center text-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <h3 className="text-sm font-bold text-gray-900">Tidak ada pesanan</h3>
          <p className="text-xs text-gray-400 mt-1">Belum ada pesanan masuk untuk kategori status ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between gap-4">
              
              {/* Info Kiri: Detail Pelanggan & Produk */}
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800">
                    ID: #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'ready' ? 'bg-emerald-100 text-emerald-800' :
                    order.status === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-800'
                  }`}>
                    {order.status === 'pending' ? 'Baru' : order.status === 'processing' ? 'Diproses' : order.status === 'ready' ? 'Siap' : order.status === 'completed' ? 'Selesai' : 'Batal'}
                  </span>
                  <span className="text-[11px] font-bold text-gray-400">
                    {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-black text-gray-900">{order.customer_name}</h4>
                  {order.customer_phone && (
                    <p className="text-xs font-bold text-gray-400 mt-0.5">{order.customer_phone}</p>
                  )}
                </div>

                {/* Items */}
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  {order.order_items?.map((item) => (
                    <div key={item.id} className="text-xs font-bold text-gray-700 flex justify-between items-start">
                      <div>
                        <span>{item.product_name} <span className="text-red-600">x{item.quantity}</span></span>
                        {item.notes && <p className="text-[11px] text-gray-400 font-normal italic mt-0.5">Catatan: {item.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Kanan: Harga & Tombol Aksi */}
              <div className="flex flex-row md:flex-col justify-between md:justify-between items-center md:items-end border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 min-w-[180px]">
                <div className="md:text-right">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Tagihan</p>
                  <p className="text-base font-black text-red-600 mt-0.5">{formatIDR(order.total_price)}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'processing')}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-sm"
                    >
                      Terima & Proses
                    </button>
                  )}
                  {order.status === 'processing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-sm"
                    >
                      Pesanan Siap
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="px-3 py-2 bg-gray-950 hover:bg-gray-900 text-white text-xs font-black rounded-xl transition-all shadow-sm"
                    >
                      Selesai Diambil
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