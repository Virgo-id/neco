'use client'

interface FormOptionalFieldsProps {
  capitalPrice: number; setCapitalPrice: (val: number) => void
  discountValue: number; setDiscountValue: (val: number) => void
  wholesalePrices: any[]; setWholesalePrices: (val: any[]) => void
  hasGift: boolean; setHasGift: (val: boolean) => void
  giftMinBuy: number | ''; setGiftMinBuy: (val: number | '') => void
  giftProductId: string; setGiftProductId: (val: string) => void
  giftQty: number | ''; setGiftQty: (val: number | '') => void
  variants: any[]; setVariants: (val: any[]) => void
  alwaysAvailable: boolean
}

export default function FormOptionalFields({
  capitalPrice, setCapitalPrice,
  discountValue, setDiscountValue,
  wholesalePrices, setWholesalePrices,
  hasGift, setHasGift,
  giftMinBuy, setGiftMinBuy,
  giftProductId, setGiftProductId,
  giftQty, setGiftQty,
  variants, setVariants,
  alwaysAvailable
}: FormOptionalFieldsProps) {

  const formatRupiah = (val: number | '') => (val === 0 || val === '' ? '' : val.toLocaleString('id-ID'))
  const parseNumber = (val: string) => Number(val.replace(/\./g, ''))

  return (
    <div className="space-y-5 animate-fade-in bg-white p-1 mt-2">
      
      {/* HEADER PENANDA FITUR TAMBAHAN */}
      <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
        <span className="w-1.5 h-3.5 bg-gray-400 rounded-full"></span>
        <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Pengaturan Tambahan (Opsional)</span>
      </div>

      {/* GRID HPP & DISKON */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* HPP / HARGA MODAL */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block">Harga Pokok Pembelian (HPP)</label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-xs font-black text-gray-500 z-10 select-none">Rp</span>
            <input 
              type="text" 
              className="w-full bg-gray-100 hover:bg-gray-200/60 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-black text-gray-950 focus:outline-none focus:bg-gray-200/80 transition-all border border-transparent focus:border-gray-300 placeholder:text-gray-400 placeholder:font-normal" 
              placeholder="0" 
              value={formatRupiah(capitalPrice)} 
              onChange={(e) => setCapitalPrice(parseNumber(e.target.value))} 
            />
          </div>
        </div>

        {/* DISKON */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block">Nominal Diskon Langsung</label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-xs font-black text-gray-500 z-10 select-none">Rp</span>
            <input 
              type="text" 
              className="w-full bg-gray-100 hover:bg-gray-200/60 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-black text-gray-950 focus:outline-none focus:bg-gray-200/80 transition-all border border-transparent focus:border-gray-300 placeholder:text-gray-400 placeholder:font-normal" 
              placeholder="0" 
              value={formatRupiah(discountValue)} 
              onChange={(e) => setDiscountValue(parseNumber(e.target.value))} 
            />
          </div>
        </div>
      </div>

      {/* SKEMA GROSIR (KOTAK HITAM MODERN) */}
      <div className="p-4 bg-gray-950 rounded-2xl space-y-4 text-white shadow-sm border border-gray-800">
        <div>
          <label className="text-xs font-black text-white uppercase tracking-wider block">Skema Grosir Multi-Price</label>
          <p className="text-[11px] font-medium text-gray-400 mt-0.5">Berikan harga khusus untuk pembelian kuantitas tertentu.</p>
        </div>
        
        <div className="space-y-2.5 max-w-xl">
          {wholesalePrices.map((item, index) => (
            <div key={index} className="flex gap-2.5 items-center bg-zinc-900 p-2 rounded-xl border border-zinc-800 animate-fade-in">
              {/* Input Qty */}
              <div className="flex items-center bg-gray-100 rounded-lg px-2.5 py-1.5 shrink-0">
                <span className="text-[10px] font-black text-gray-500 uppercase mr-1.5 select-none">Min. Qty</span>
                <input 
                  type="number" 
                  required 
                  placeholder="0" 
                  min="1" 
                  className="w-12 text-center text-xs font-black text-gray-950 bg-transparent focus:outline-none" 
                  value={item.min_qty || ''} 
                  onChange={(e) => { const u = [...wholesalePrices]; u[index].min_qty = Number(e.target.value); setWholesalePrices(u) }} 
                />
              </div>
              {/* Input Harga Grosir */}
              <div className="flex-1 relative flex items-center">
                <span className="absolute left-3 text-xs font-black text-gray-500 select-none">Rp</span>
                <input 
                  type="text" 
                  required 
                  placeholder="Harga grosir per pcs" 
                  className="w-full bg-gray-100 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-black text-gray-950 focus:outline-none focus:bg-gray-200 transition-all placeholder:text-gray-400 placeholder:font-normal" 
                  value={formatRupiah(item.price)} 
                  onChange={(e) => { const u = [...wholesalePrices]; u[index].price = parseNumber(e.target.value); setWholesalePrices(u) }} 
                />
              </div>
              {/* Tombol Hapus */}
              <button 
                type="button" 
                onClick={() => setWholesalePrices(wholesalePrices.filter((_, i) => i !== index))} 
                className="text-gray-400 hover:text-red-500 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors active:scale-95 cursor-pointer"
                title="Hapus baris"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end max-w-xl">
          <button 
            type="button" 
            onClick={() => setWholesalePrices([...wholesalePrices, { min_qty: '', price: '' }])} 
            className="inline-flex items-center gap-1.5 text-[11px] font-black bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded-xl transition-all uppercase tracking-wider active:scale-95 shadow-xs cursor-pointer"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Skema Harga Grosir
          </button>
        </div>
      </div>

      {/* PROMO HADIAH (GIFT) */}
      <div className={`p-4 rounded-2xl border transition-all duration-200 ${hasGift ? 'border-red-500 bg-red-50/20' : 'border-gray-200 bg-gray-50/50'}`}>
        <label className="flex items-center gap-3 text-xs font-black text-gray-900 cursor-pointer select-none uppercase tracking-wider">
          <input 
            type="checkbox" 
            className="accent-red-600 shrink-0 h-4 w-4 rounded cursor-pointer" 
            checked={hasGift} 
            onChange={(e) => setHasGift(e.target.checked)} 
          />
          Aktifkan Aturan Promo Hadiah Langsung
        </label>
        
        {hasGift && (
          <div className="space-y-3 pt-3 text-xs animate-fade-in">
            <div className="bg-gray-100 p-2.5 rounded-xl text-gray-700 font-bold leading-relaxed text-[11px] border border-gray-200">
              <span className="font-black text-red-600 uppercase text-[9px] block mb-0.5 tracking-wider">Mekanisme:</span>
              Beli minimal <span className="font-black text-gray-900">X item</span>, gratis <span className="font-black text-gray-900">Z pcs</span> produk <span className="font-mono text-xs font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-md">ID Produk Y</span>.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">Min. Beli (X)</span>
                <input 
                  type="number" 
                  required 
                  placeholder="0" 
                  min="1" 
                  className="w-full bg-gray-100 hover:bg-gray-200/60 focus:bg-gray-200/80 rounded-xl px-3 py-2 text-xs font-black text-gray-950 focus:outline-none transition-all border border-transparent focus:border-gray-300 placeholder:text-gray-400 placeholder:font-normal" 
                  value={giftMinBuy} 
                  onChange={(e) => setGiftMinBuy(e.target.value !== '' ? Number(e.target.value) : '')} 
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">ID Produk Bonus (Y)</span>
                <input 
                  type="text" 
                  required 
                  placeholder="ID-PROD" 
                  className="w-full bg-gray-100 hover:bg-gray-200/60 focus:bg-gray-200/80 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-950 focus:outline-none transition-all border border-transparent focus:border-gray-300 placeholder:text-gray-400 placeholder:font-normal" 
                  value={giftProductId} 
                  onChange={(e) => setGiftProductId(e.target.value)} 
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">Jumlah Bonus (Z)</span>
                <input 
                  type="number" 
                  required 
                  placeholder="0" 
                  min="1" 
                  className="w-full bg-gray-100 hover:bg-gray-200/60 focus:bg-gray-200/80 rounded-xl px-3 py-2 text-xs font-black text-gray-950 focus:outline-none transition-all border border-transparent focus:border-gray-300 placeholder:text-gray-400 placeholder:font-normal" 
                  value={giftQty} 
                  onChange={(e) => setGiftQty(e.target.value !== '' ? Number(e.target.value) : '')} 
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VARIAN (KOTAK HITAM MODERN) */}
      <div className="p-4 bg-gray-950 rounded-2xl space-y-4 text-white shadow-sm border border-gray-800">
        <div>
          <label className="text-xs font-black text-white uppercase tracking-wider block">Varian Kombinasi Produk</label>
          <p className="text-[11px] font-medium text-gray-400 mt-0.5">Gunakan bila produk memiliki opsi tambahan ukuran, rasa, atau tipe.</p>
        </div>

        <div className="space-y-3 max-w-xl">
          {variants.map((variant, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-zinc-900 p-3 rounded-xl items-center border border-zinc-800 animate-fade-in">
              <div className="sm:col-span-5 space-y-1">
                <span className="text-[10px] font-black text-gray-400 uppercase block">Nama Opsi Varian</span>
                <input 
                  type="text" 
                  required 
                  placeholder="Large / Dingin" 
                  className="w-full bg-gray-100 focus:bg-gray-200 rounded-lg px-3 py-1.5 text-xs font-black text-gray-950 focus:outline-none transition-all placeholder:text-gray-400 placeholder:font-normal" 
                  value={variant.name} 
                  onChange={(e) => { const u = [...variants]; u[index].name = e.target.value; setVariants(u) }} 
                />
              </div>
              <div className="sm:col-span-4 space-y-1">
                <span className="text-[10px] font-black text-gray-400 uppercase block">+ Harga Tambahan</span>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-xs font-bold text-gray-500 z-10 select-none">+Rp</span>
                  <input 
                    type="text" 
                    placeholder="0" 
                    className="w-full bg-gray-100 focus:bg-gray-200 rounded-lg pl-9 pr-2.5 py-1.5 text-xs font-black text-gray-950 focus:outline-none transition-all placeholder:text-gray-400 placeholder:font-normal" 
                    value={formatRupiah(variant.additional_price)} 
                    onChange={(e) => { const u = [...variants]; u[index].additional_price = parseNumber(e.target.value); setVariants(u) }} 
                  />
                </div>
              </div>
              
              <div className="sm:col-span-2 space-y-1">
                {!alwaysAvailable ? (
                  <>
                    <span className="text-[10px] font-black text-gray-400 uppercase block">Stok</span>
                    <input 
                      type="number" 
                      required 
                      placeholder="0" 
                      min="0" 
                      className="w-full bg-gray-100 focus:bg-gray-200 rounded-lg px-2 py-1.5 text-xs text-center font-black text-gray-950 focus:outline-none transition-all placeholder:text-gray-400 placeholder:font-normal" 
                      value={variant.stock === -1 ? '' : variant.stock} 
                      onChange={(e) => { const u = [...variants]; u[index].stock = Number(e.target.value); setVariants(u) }} 
                    />
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-black text-emerald-400 uppercase block select-none">Status</span>
                    <div className="text-center text-[10px] font-black text-emerald-400 bg-emerald-950/50 border border-emerald-800 rounded-lg py-1.5 select-none tracking-wider uppercase">Ready</div>
                  </>
                )}
              </div>
              <div className="sm:col-span-1 text-center pt-3 sm:pt-4">
                <button 
                  type="button" 
                  onClick={() => setVariants(variants.filter((_, i) => i !== index))} 
                  className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors active:scale-95 cursor-pointer"
                  title="Hapus varian"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end max-w-xl">
          <button 
            type="button" 
            onClick={() => setVariants([...variants, { name: '', additional_price: 0, stock: alwaysAvailable ? -1 : 0 }])} 
            className="inline-flex items-center gap-1.5 text-[11px] font-black bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded-xl transition-all uppercase tracking-wider active:scale-95 shadow-xs cursor-pointer"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Opsi Varian Baru
          </button>
        </div>
      </div>

    </div>
  )
}