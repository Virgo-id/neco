'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/utils/supabase'

interface Product {
  id: string
  name: string
  price: number
  is_available: boolean
}

interface CartItem {
  product: Product
  quantity: number
  notes: string
}

interface Order {
  id: string
  created_at: string
  table_number: string
  total_price: number
  status: 'pending' | 'cooking' | 'served' | 'completed'
}

export default function OrderStaffPage({
  params,
}: {
  params: Promise<{ marketid: string }>
}) {
  const { marketid } = use(params)
  const [products, setProducts] = useState<Product[]>([])
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [tableNumber, setTableNumber] = useState<string>('')
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'create' | 'monitor'>('create')

  useEffect(() => {
    fetchProducts()
    fetchActiveDineInOrders()

    const channel = supabase
      .channel(`realtime-staff-orders-${marketid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `market_id=eq.${marketid}` },
        () => { fetchActiveDineInOrders() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [marketid])

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true)
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, is_available')
        .eq('market_id', marketid)
        .eq('is_available', true)

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.error('Gagal mengambil produk:', err)
    } finally {
      setLoadingProducts(false)
    }
  }

  const fetchActiveDineInOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, table_number, total_price, status')
        .eq('market_id', marketid)
        .eq('method', 'dinein_staff')
        .neq('status', 'completed')
        .order('created_at', { ascending: false })

      if (error) throw error
      setActiveOrders(data || [])
    } catch (err) {
      console.error('Gagal mengambil antrean dine-in:', err)
    }
  }

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { product, quantity: 1, notes: '' }]
    })
  }

  const updateQuantity = (productId: string, amount: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + amount
        return newQty > 0 ? { ...item, quantity: newQty } : null
      }
      return item
    }).filter(Boolean) as CartItem[])
  }

  const updateNotes = (productId: string, notes: string) => {
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, notes } : item))
  }

  const calculateTotal = () => {
    return cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tableNumber) return alert('Silakan isi nomor meja terlebih dahulu!')
    if (cart.length === 0) return alert('Keranjang masih kosong!')

    try {
      setSubmitting(true)
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          market_id: marketid,
          method: 'dinein_staff',
          table_number: tableNumber,
          total_price: calculateTotal(),
          status: 'pending'
        })
        .select()
        .single()

      if (orderError) throw orderError

      const orderItemsPayload = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        notes: item.notes
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload)

      if (itemsError) throw itemsError

      setCart([])
      setTableNumber('')
      setActiveTab('monitor')
      alert('Pesanan berhasil dibuat!')
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan saat menginput pesanan.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId)

      if (error) throw error
    } catch (err) {
      console.error(err)
    }
  }

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-950 tracking-tight">Dine-In Staff</h2>
          <p className="text-xs font-medium text-gray-500 mt-1">Sistem pencatatan pesanan langsung di meja oleh pelayan.</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${
              activeTab === 'create' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Input Pesanan
          </button>
          <button
            onClick={() => setActiveTab('monitor')}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all relative ${
              activeTab === 'monitor' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Daftar Meja ({activeOrders.length})
          </button>
        </div>
      </div>

      {/* RENDER TAB 1: INPUT PESANAN BARU */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Menu Produk */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Menu Tersedia</h3>
            {loadingProducts ? (
              <div className="h-40 bg-white border border-gray-200 rounded-2xl flex items-center justify-center animate-pulse text-xs font-bold text-gray-400">
                Memuat daftar menu...
              </div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-400">
                Belum ada produk aktif yang tersedia.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm text-left hover:border-red-500/50 hover:shadow transition-all active:scale-98 flex justify-between items-center group"
                  >
                    <div>
                      <h4 className="text-sm font-black text-gray-900 group-hover:text-red-600 transition-colors">{product.name}</h4>
                      <p className="text-xs font-extrabold text-gray-500 mt-1">{formatIDR(product.price)}</p>
                    </div>
                    <span className="p-1.5 bg-red-50 text-red-600 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-all">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Keranjang & Input Meja */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 sticky top-24">
            <h3 className="text-xs font-black text-gray-950 uppercase tracking-wider pb-2 border-b border-gray-100">Detail Order</h3>
            
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Nomor Meja</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Meja 05"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full text-sm font-bold bg-gray-50 border border-gray-200 focus:border-red-500 focus:bg-white outline-none px-4 py-2.5 rounded-xl transition-all"
                />
              </div>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Item Terpilih</label>
                {cart.length === 0 ? (
                  <p className="text-xs text-gray-400 font-medium italic py-2">Belum ada item yang dipilih.</p>
                ) : (
                  cart.map(item => (
                    <div key={item.product.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h5 className="text-xs font-black text-gray-900">{item.product.name}</h5>
                          <span className="text-[11px] text-gray-400 font-bold">{formatIDR(item.product.price * item.quantity)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
                          <button type="button" onClick={() => updateQuantity(item.product.id, -1)} className="px-1.5 py-0.5 text-xs font-bold text-gray-500 hover:text-red-600">-</button>
                          <span className="text-xs font-black text-gray-800 px-1 min-w-[14px] text-center">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.product.id, 1)} className="px-1.5 py-0.5 text-xs font-bold text-gray-500 hover:text-red-600">+</button>
                        </div>
                      </div>
                      
                      <input
                        type="text"
                        placeholder="Tambahkan catatan..."
                        value={item.notes}
                        onChange={(e) => updateNotes(item.product.id, e.target.value)}
                        className="w-full text-[11px] font-medium bg-white border border-gray-200 px-2 py-1 rounded-lg focus:outline-none"
                      />
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <div>
                  <span className="text-[11px] font-bold text-gray-400">Total Biaya</span>
                  <p className="text-base font-black text-red-600">{formatIDR(calculateTotal())}</p>
                </div>
                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-100 disabled:text-gray-400 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-red-100 active:scale-98"
                >
                  {submitting ? 'Menyimpan...' : 'Kirim ke Dapur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENDER TAB 2: MONITORING MEJA AKTIF */}
      {activeTab === 'monitor' && (
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Antrean Layanan Meja</h3>
          {activeOrders.length === 0 ? (
            <div className="min-h-[200px] flex flex-col items-center justify-center bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
              <p className="text-sm font-bold text-gray-900">Semua Meja Bersih</p>
              <p className="text-xs text-gray-400 mt-1">Tidak ada transaksi dine-in yang sedang berjalan saat ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeOrders.map(order => (
                <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-lg font-black text-gray-950">{order.table_number}</span>
                      <p className="text-[11px] font-bold text-gray-400 mt-0.5">Mulai: {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      order.status === 'cooking' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {order.status === 'pending' ? 'Antre' : order.status === 'cooking' ? 'Dimasak' : 'Disajikan'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block">Billing</span>
                      <span className="text-sm font-black text-red-600">{formatIDR(order.total_price)}</span>
                    </div>

                    <div className="flex gap-1.5">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'cooking')}
                          className="px-2.5 py-1.5 bg-blue-600 text-white text-[11px] font-black rounded-lg hover:bg-blue-700 transition-all"
                        >
                          Masak
                        </button>
                      )}
                      {order.status === 'cooking' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'served')}
                          className="px-2.5 py-1.5 bg-emerald-600 text-white text-[11px] font-black rounded-lg hover:bg-emerald-700 transition-all"
                        >
                          Sajikan
                        </button>
                      )}
                      {order.status === 'served' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className="px-2.5 py-1.5 bg-gray-950 text-white text-[11px] font-black rounded-lg hover:bg-gray-900 transition-all"
                        >
                          Selesai & Bayar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}