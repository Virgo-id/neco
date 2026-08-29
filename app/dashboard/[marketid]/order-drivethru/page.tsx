'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/utils/supabase'

interface Order {
  id: string
  created_at: string
  customer_name: string
  vehicle_info: string // Menyimpan info plat nomor atau jenis kendaraan (misal: "Avanza Hitam - B 1234 XYZ")
  total_price: number
  status: 'pending' | 'preparing' | 'serving' | 'completed' | 'cancelled'
  order_items: {
    id: string
    product_name: string
    quantity: number
    notes?: string
  }[]
}

export default function OrderDriveThruPage({
  params,
}: {
  params: Promise<{ marketid: string }>
}) {
  const { marketid } = use(params)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [activeFilter, setActiveFilter] = useState<string>('all')

  useEffect(() => {
    fetchDriveThruOrders()

    // ─── SUPABASE REALTIME SUBSCRIPTION ───
    const channel = supabase
      .channel(`realtime-drivethru-orders-${marketid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `market_id=eq.${marketid}`,
        },
        () => {
          fetchDriveThruOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [marketid])

  const fetchDriveThruOrders = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, created_at, customer_name, vehicle_info, total_price, status,
          order_items (id, product_name, quantity, notes)
        `)
        .eq('market_id', marketid)
        .eq('method', 'drivethru') // Memastikan filter khusus jalur Drive Thru
        .order('created_at', { ascending: true }) // FIFO: Yang datang duluan berada di atas antrean

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Gagal memuat pesanan Drive Thru:', err)
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
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o))
    } catch (err) {
      alert('Gagal memperbarui status antrean')
      console.error(err)
    }
  }

  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'all') return order.status !== 'completed' && order.status !== 'cancelled' // Default: Hanya tampilkan antrean aktif
    if (activeFilter === 'history') return order.status === 'completed' || order.status === 'cancelled'
    return order.status === activeFilter
  })

  const statusTabs = [
    { id: 'all', name: 'Antrean Aktif' },
    { id: 'pending', name: 'Loket Tiket (Baru)' },
    { id: 'preparing', name: 'Dapur (Disiapkan)' },
    { id: 'serving', name: 'Loket Ambil (Siap)' },
    { id: 'history', name: 'Riwayat Hari Ini' },
  ]

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-gray-950 tracking-tight">Order Drive Thru</h2>
          <p className="text-xs font-medium text-gray-500 mt-1">Pantau urutan kendaraan dan serahkan pesanan secara cepat tanpa pelanggan turun.</p>
        </div>
        <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl self-start sm:self-center flex items-center gap-1.5 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-600"></span> Jalur Aktif
        </div>
      </div>

      {/* Filter Jalur / Loket Status */}
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

      {/* Daftar Antrean Kendaraan */}
      {loading && orders.length === 0 ? (
        <div className="min-h-[250px] flex flex-col items-center justify-center gap-2 text-sm font-semibold text-gray-500 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <svg className="animate-spin h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Sinkronisasi antrean kendaraan...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="min-h-[250px] flex flex-col items-center justify-center text-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16v-4a2 2 0 00-2-2h-3l-2-4H9" />
          </svg>
          <h3 className="text-sm font-bold text-gray-900">Jalur Kosong</h3>
          <p className="text-xs text-gray-400 mt-1">Tidak ada kendaraan di area check-point status ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map((order, index) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between gap-4 relative overflow-hidden">
              
              {/* Indikator Urutan Antrean FIFO */}
              {activeFilter === 'all' && (
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-red-600" title={`Antrean ke-${index + 1}`} />
              )}

              {/* Info Detail Kendaraan & Belanjaan */}
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-gray-900 text-white tracking-wide">
                    {order.vehicle_info || 'Identitas Kendaraan Kosong'}
                  </span>
                  
                  <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'serving' ? 'bg-emerald-100 text-emerald-800' :
                    order.status === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-800'
                  }`}>
                    {order.status === 'pending' ? 'Masuk' : order.status === 'preparing' ? 'Dapur' : order.status === 'serving' ? 'Siap Saji' : order.status === 'completed' ? 'Selesai' : 'Batal'}
                  </span>

                  <span className="text-[11px] font-bold text-gray-400">
                    Masuk: {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-black text-gray-900">Atas Nama: {order.customer_name}</h4>
                  <p className="text-[11px] font-bold text-gray-400 mt-0.5">ID: #{order.id.slice(0, 8).toUpperCase()}</p>
                </div>

                {/* Daftar Menu Items */}
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

              {/* Tagihan & Kendali Loket Jendela Staf */}
              <div className="flex flex-row md:flex-col justify-between md:justify-between items-center md:items-end border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 min-w-[200px]">
                <div className="md:text-right">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Pembayaran</p>
                  <p className="text-base font-black text-red-600 mt-0.5">{formatIDR(order.total_price)}</p>
                </div>

                {/* Tombol Aksi Kendali Pergerakan Jalur Kendaraan */}
                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-sm"
                    >
                      Kirim ke Dapur
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'serving')}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-sm"
                    >
                      Siap Diserahkan
                    </button>
                  )}
                  {order.status === 'serving' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="px-3 py-2 bg-gray-950 hover:bg-gray-900 text-white text-xs font-black rounded-xl transition-all shadow-sm"
                    >
                      Selesai & Jalan
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