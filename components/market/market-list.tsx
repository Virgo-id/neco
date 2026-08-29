'use client'

import Link from 'next/link'

interface MarketListProps {
  markets: any[]
  onOpenCreate: () => void
  onOpenEdit: (market: any) => void
  onCloseModal?: () => void // Optional: untuk menutup modal jika komponen ini berada di dalam modal
}

export default function MarketList({ 
  markets, 
  onOpenCreate, 
  onOpenEdit,
  onCloseModal 
}: MarketListProps) {

  // Jika belum ada toko
  if (markets.length === 0) {
    return (
      <div className="text-center py-10 rounded-2xl bg-gray-50/60 border border-dashed border-gray-200 px-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0V11m0 0h5m-5 0H7m3 4h2M9 7h2m3 4h2m-2 4h2M9 15h2" />
          </svg>
        </div>
        <p className="text-sm font-bold text-gray-900 mb-1">Belum Ada Toko Terdaftar</p>
        <p className="text-xs text-gray-500 mb-5 max-w-xs mx-auto">
          Mulai bangun kanal bisnis ritel, restoran, atau platform jasa Anda sekarang.
        </p>
        <button
          onClick={onOpenCreate}
          className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-red-700 transition-all active:scale-95 shadow-sm"
        >
          Buat Toko Baru
        </button>
      </div>
    )
  }

  const getDashboardUrl = (market: any) => {
    return `/dashboard/${market.id}`
  }

  const handleNavigate = () => {
    if (onCloseModal) {
      onCloseModal()
    }
  }

  return (
    <div className="space-y-3">
      {/* Sub-headerRingkas */}
      <div className="pb-3 mb-4 border-b border-gray-100 flex justify-between items-center gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Toko Terdaftar</h3>
          <p className="text-xs text-gray-500">Pilih toko untuk mengelola operasional.</p>
        </div>
        <button
          onClick={onOpenCreate}
          className="bg-red-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-all active:scale-95 shrink-0 flex items-center gap-1.5 shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Buat Toko
        </button>
      </div>

      {/* Daftar Toko */}
      {markets.map((m) => {
        const targetDashboardUrl = getDashboardUrl(m)

        return (
          <div 
            key={m.id} 
            className="p-4 bg-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all border border-gray-100 hover:border-gray-200 shadow-sm"
          >
            {/* Info Toko (Klik untuk navigasi) */}
            <Link 
              href={targetDashboardUrl} 
              onClick={handleNavigate}
              className="flex items-start gap-3.5 overflow-hidden flex-grow group"
            >
              <div className="w-10 h-10 bg-gray-50 text-gray-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-red-50 group-hover:text-red-600 transition-colors uppercase overflow-hidden border border-gray-100">
                {m.market_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.market_logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  m.market_name?.charAt(0) || 'T'
                )}
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                    {m.market_name}
                  </h3>
                  {m.market_type && (
                    <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                      {m.market_type}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  @{m.market_username || 'username'} • Wallet: Rp {parseFloat(m.market_wallet || 0).toLocaleString('id-ID')}
                </p>
                
                {/* Status Fitur */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {m.is_pickup_enabled && <span className="bg-emerald-50 border border-emerald-200/60 text-emerald-600 text-[10px] px-2 py-0.5 rounded-md font-semibold">Pick Up</span>}
                  {m.is_delivery_enabled && <span className="bg-blue-50 border border-blue-200/60 text-blue-600 text-[10px] px-2 py-0.5 rounded-md font-semibold">Delivery</span>}
                  {m.is_order_from_table_enabled && <span className="bg-purple-50 border border-purple-200/60 text-purple-600 text-[10px] px-2 py-0.5 rounded-md font-semibold">Order Table</span>}
                </div>
              </div>
            </Link>
            
            {/* Tombol Aksi */}
            <div className="flex items-center gap-2 shrink-0 sm:self-center self-end border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
              <Link
                href={targetDashboardUrl}
                onClick={handleNavigate}
                className="bg-gray-950 hover:bg-black text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors text-center min-w-[70px]"
              >
                Console
              </Link>
              <button
                type="button"
                onClick={() => onOpenEdit(m)}
                className="text-gray-600 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-gray-100 hover:text-gray-900 transition-colors border border-gray-200"
              >
                Edit
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}