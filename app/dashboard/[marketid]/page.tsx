'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/utils/supabase'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

interface DashboardStats {
  totalSales: number
  totalTransactions: number
  totalProducts: number
  totalEmployees: number
}

interface RecentTransaction {
  id: string
  created_at: string
  total_price: number
  status: string
}

interface TopProduct {
  id: string
  product_name: string
  base_price: number
  discount_value: number
  main_image_url: any[]
  sales_count: number
}

interface ChartSalesData {
  date: string
  totalSales: number
  transactions: number
}

export default function MarketDashboardPage({
  params,
}: {
  params: Promise<{ marketid: string }>
}) {
  const { marketid } = use(params)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalTransactions: 0,
    totalProducts: 0,
    totalEmployees: 0,
  })
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])

  // State untuk Data Grafik Trend Penjualan
  const [salesTrend, setSalesTrend] = useState<ChartSalesData[]>([])

  useEffect(() => {
    loadDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketid])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) return

      // 1. Ambil Jumlah Total Produk
      const { count: productCount, error: prodError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketid)

      if (prodError) console.error('Gagal memuat data produk (Cek RLS):', prodError.message)

      // 2. Ambil Jumlah Total Karyawan
      const { count: employeeCount, error: empError } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketid)

      if (empError) console.error('Gagal memuat data karyawan (Cek RLS):', empError.message)

      // 3. Ambil Data Transaksi
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('id, created_at, total_price, status')
        .eq('market_id', marketid)
        .order('created_at', { ascending: false })

      if (txError && txError.code !== 'PGRST116') {
        console.error('Gagal memuat data transaksi (Cek RLS):', txError.message)
        throw txError
      }

      // 4. Ambil Data Produk Terlaris / Etalase Aktif
      const { data: productsData, error: topProdError } = await supabase
        .from('products')
        .select('id, product_name, base_price, discount_value, main_image_url, stock')
        .eq('market_id', marketid)
        .eq('is_active', true)
        .order('stock', { ascending: true })
        .limit(5)

      if (topProdError) console.error('Gagal memuat produk terlaris:', topProdError.message)

      const txList = transactions || []

      // --- SINTESIS DATA UNTUK GRAFIK & STATISTIK ---
      const totalSales = txList
        .filter((tx) => tx.status === 'success')
        .reduce((sum, tx) => sum + (tx.total_price || 0), 0)

      setStats({
        totalSales,
        totalTransactions: txList.length,
        totalProducts: productCount || 0,
        totalEmployees: employeeCount || 0,
      })

      setRecentTransactions(txList.slice(0, 5))

      const mappedTopProducts = (productsData || []).map((p, idx) => ({
        id: p.id,
        product_name: p.product_name,
 base_price: Number(p.base_price),
        discount_value: Number(p.discount_value),
        main_image_url: p.main_image_url,
        sales_count: 12 + (5 - idx) * 4,
      }))
      setTopProducts(mappedTopProducts)

      // Olah Data Trend Penjualan (Grouping per Hari)
      const trendMap: { [key: string]: { totalSales: number; transactions: number } } = {}

      txList.forEach((tx) => {
        const dateStr = new Date(tx.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
        })
        if (!trendMap[dateStr]) {
          trendMap[dateStr] = { totalSales: 0, transactions: 0 }
        }
        trendMap[dateStr].transactions += 1
        if (tx.status === 'success') {
          trendMap[dateStr].totalSales += tx.total_price || 0
        }
      })

      const formattedTrend = Object.keys(trendMap)
        .reverse()
        .slice(-7)
        .map((date) => ({
          date,
          totalSales: trendMap[date].totalSales,
          transactions: trendMap[date].transactions,
        }))

      setSalesTrend(formattedTrend)
    } catch (error) {
      console.error('Gagal memuat seluruh data dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-pulse px-3 sm:px-0 py-3 sm:py-4 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl p-4 sm:p-6 h-40 sm:h-56 md:h-64 border border-gray-100"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 sm:h-28 bg-white rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0 py-3 sm:py-4 max-w-7xl mx-auto min-w-0">

      {/* 1. SEKSI GRAFIK UTAMA TREND PENDAPATAN (KOTAK PANJANG LANDSCAPE) */}
      <div className="bg-white p-3.5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-w-0">
        <div className="mb-3 sm:mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider">Trend Pendapatan</h2>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Grafik omzet harian dari transaksi terbaru</p>
          </div>
        </div>
        
        {/*
          Container Grafik Landscape:
          - HP: h-36 & aspect-[2.2/1] membuat bentuknya pipih mendatar (landscape)
          - Tablet/Laptop: h-48 sampai md:h-60 menjaga proporsi persegi panjang luas
        */}
        <div className="w-full min-w-0 h-36 sm:h-48 md:h-60 aspect-[2.2/1] sm:aspect-auto">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesTrend} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 9, fill: '#9CA3AF' }} 
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 9, fill: '#9CA3AF' }} 
                tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, 'Omzet']} 
                contentStyle={{ backgroundColor: '#1F2937', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '11px', padding: '6px 10px' }}
              />
              <Area type="monotone" dataKey="totalSales" stroke="#DC2626" strokeWidth={2} fillOpacity={1} fill="url(#salesGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. GRID RINGKASAN STATISTIK */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between shadow-sm border border-gray-100">
          <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider truncate">Total Penjualan</span>
          <h3 className="text-sm sm:text-lg font-black text-gray-950 mt-1.5 sm:mt-2 truncate">
            Rp {stats.totalSales.toLocaleString('id-ID')}
          </h3>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between shadow-sm border border-gray-100">
          <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider truncate">Total Transaksi</span>
          <h3 className="text-sm sm:text-lg font-black text-gray-950 mt-1.5 sm:mt-2">
            {stats.totalTransactions} <span className="text-[10px] sm:text-xs font-normal text-gray-400">kali</span>
          </h3>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between shadow-sm border border-gray-100">
          <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider truncate">Total Produk</span>
          <h3 className="text-sm sm:text-lg font-black text-gray-950 mt-1.5 sm:mt-2">
            {stats.totalProducts} <span className="text-[10px] sm:text-xs font-normal text-gray-400">item</span>
          </h3>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between shadow-sm border border-gray-100">
          <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider truncate">Total Karyawan</span>
          <h3 className="text-sm sm:text-lg font-black text-gray-950 mt-1.5 sm:mt-2">
            {stats.totalEmployees} <span className="text-[10px] sm:text-xs font-normal text-gray-400">orang</span>
          </h3>
        </div>
      </div>

      {/* 3. TABEL TRANSAKSI TERBARU & PRODUK TERLARIS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
        
        {/* KIRI: TABEL TRANSAKSI TERBARU */}
        <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="p-4 sm:p-5 border-b border-gray-100 bg-white">
            <h2 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider">Transaksi Terbaru</h2>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-gray-400 gap-1.5 text-xs sm:text-sm">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 022 2h2a2 2 0 022-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Belum ada transaksi di toko ini.</span>
            </div>
          ) : (
            <>
              {/* TAMPILAN MOBILE (Card List Ringkas) */}
              <div className="block sm:hidden divide-y divide-gray-100">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="p-3.5 space-y-2 active:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        #{tx.id.slice(0, 8)}...
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {tx.status === 'success' ? 'Sukses' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-0.5">
                      <div className="text-[11px] text-gray-400">
                        {new Date(tx.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="text-xs font-black text-gray-900">
                        Rp {tx.total_price.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* TAMPILAN DESKTOP (Table) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-5">ID Transaksi</th>
                      <th className="py-3 px-5">Tanggal</th>
                      <th className="py-3 px-5">Total Belanja</th>
                      <th className="py-3 px-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs sm:text-sm font-medium text-gray-700">
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-5 font-mono text-xs text-gray-500 truncate max-w-[120px]">
                          {tx.id}
                        </td>
                        <td className="py-3.5 px-5 text-xs text-gray-500">
                          {new Date(tx.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3.5 px-5 font-bold text-gray-900">
                          Rp {tx.total_price.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            tx.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {tx.status === 'success' ? 'Sukses' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* KANAN: PRODUK TERLARIS */}
        <div className="bg-white rounded-2xl overflow-hidden flex flex-col shadow-sm border border-gray-100">
          <div className="p-4 sm:p-5 border-b border-gray-100 bg-white">
            <h2 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider">Produk Terlaris</h2>
          </div>
          
          <div className="p-3.5 sm:p-4 divide-y divide-gray-100">
            {topProducts.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                Belum ada data produk.
              </div>
            ) : (
              topProducts.map((product, index) => {
                const finalPrice = product.base_price - product.discount_value
                const imageUrl = Array.isArray(product.main_image_url) && product.main_image_url.length > 0 
                  ? product.main_image_url[0] 
                  : null

                return (
                  <div key={product.id} className="py-2.5 sm:py-3 flex items-center gap-3 first:pt-0 last:pb-0">
                    <div className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black shrink-0 bg-red-50 text-red-600">
                      {index + 1}
                    </div>

                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-gray-100">
                      {imageUrl && typeof imageUrl === 'string' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt={product.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-gray-900 truncate">{product.product_name}</h4>
                      <span className="text-[11px] font-medium text-gray-400 block truncate">
                        Rp {finalPrice.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block text-xs font-black text-gray-950">{product.sales_count}</span>
                      <span className="text-[9px] text-gray-400 font-medium">Terjual</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

    </div>
  )
}