'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/utils/supabase'

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  notes: string | null
}

interface QrOrder {
  id: string
  created_at: string
  table_number: string
  total_price: number
  status: 'pending' | 'cooking' | 'served' | 'completed' | 'cancelled'
  order_items: OrderItem[]
}

export default function OrderTableQrPage({
  params,
}: {
  params: Promise<{ marketid: string }>
}) {
  const { marketid } = use(params)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<QrOrder[]>([])
  const [activeFilter, setActiveFilter] = useState<string>('all')

  useEffect(() => {
    fetchQrOrders()

    // ─── SUPABASE REALTIME SUBSCRIPTION ───
    const channel = supabase
      .channel(`realtime-qr-orders-${marketid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `market_id=eq.${marketid}`,
        },
        () => {
          // Re-fetch untuk memperbarui relasi order_items secara akurat
          fetchQrOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketid])

  const fetchQrOrders = async () => {
    try {
      setLoading(true)
      // Memfilter order dengan method 'table_qr'
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, created_at, table_number, total_price, status,
          order_items (id, product_name, quantity, notes)
        `)
        .eq('market_id', marketid)
        .eq('method', 'table_qr')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Gagal memuat pesanan QR Meja:', err)
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
    { id: 'all', name: 'Semua Antrean' },
    { id: 'pending', name: 'Belum Dikonfirmasi' },
    { id: 'cooking', name: 'Sedang Dimasak' },
    { id: 'served', name: 'Sudah Disajikan' },
    { id: 'completed', name: 'Selesai / Paid' },
  ]

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-gray-950 tracking-tight">Dine-In QR Meja</h2>
          <p className="text-xs font-medium text-gray-500 mt-1">Monitoring pesanan mandiri yang dikirim oleh pelanggan langsung via scan QR Code meja.</p>
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

      {/* Orders Container */}
      {loading && orders.length === 0 ? (
        <div className="min-h-[250px] flex flex-col items-center justify-center gap-2 text-sm font-semibold text-gray-500 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <svg className="animate-spin h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Menyelaraskan pesanan meja...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="min-h-[250px] flex flex-col items-center justify-center text-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01" />
          </svg>
          <h3 className="text-sm font-bold text-gray-900">Antrean Kosong</h3>
          <p className="text-xs text-gray-400 mt-1">Tidak ditemukan pesanan aktif dari scan QR untuk kategori status ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4">
              
              {/* Bagian Atas: Identitas Meja & Waktu */}
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="text-base font-black text-gray-950 tracking-tight">
                      {order.table_number || 'Tanpa Meja'}
                    </h3>
                    <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                      Masuk: {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </p>
                  </div>
                  
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    order.status === 'pending' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                    order.status === 'cooking' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'served' ? 'bg-emerald-100 text-emerald-800' :
                    order.status === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-800'
                  }`}>
                    {order.status === 'pending' ? 'Masuk' : order.status === 'cooking' ? 'Dimasak' : order.status === 'served' ? 'Disajikan' : order.status === 'completed' ? 'Selesai' : 'Batal'}
                  </span>
                </div>

                {/* Daftar Item Pesanan Pelanggan */}
                <div className="border-t border-b border-gray-100 py-3 space-y-2">
                  {order.order_items?.map((item) => (
                    <div key={item.id} className="text-xs font-bold text-gray-700 flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-gray-900">
                          {item.product_name} <span className="text-red-600 ml-1">x{item.quantity}</span>
                        </p>
                        {item.notes && (
                          <p className="text-[11px] text-gray-400 font-normal italic mt-0.5">
                            📌 {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bagian Bawah: Total Biaya & Manajemen Alur Kerja Staf */}
              <div className="flex justify-between items-center pt-1">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Total Tagihan</span>
                  <span className="text-sm font-black text-red-600">{formatIDR(order.total_price)}</span>
                </div>

                {/* Tombol Alur Kendali Status */}
                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        className="px-2.5 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs font-bold rounded-xl transition-all"
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'cooking')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-sm"
                      >
                        Terima & Masak
                      </button>
                    </>
                  )}
                  {order.status === 'cooking' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'served')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-sm"
                    >
                      Sajikan Ke Meja
                    </button>
                  )}
                  {order.status === 'served' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="px-3 py-1.5 bg-gray-950 hover:bg-gray-900 text-white text-xs font-black rounded-xl transition-all shadow-sm"
                    >
                      Selesai / Lunas
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