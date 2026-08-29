'use client'

import { RefObject, useState, useEffect } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

interface FormRequiredFieldsProps {
  productName: string; setProductName: (val: string) => void
  categoryName: string; setCategoryName: (val: string) => void
  sku: string; setSku: (val: string) => void
  basePrice: number | ''; setBasePrice: (val: number | '') => void
  alwaysAvailable: boolean; setAlwaysAvailable: (val: boolean) => void
  stock: number | ''; setStock: (val: number | '') => void
  images: any[]; handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; handleRemoveImage: (idx: number) => void
  fileInputRef: RefObject<HTMLInputElement | null>; submitting: boolean; uploadingImage: boolean
}

export default function FormRequiredFields({
  productName, setProductName,
  categoryName, setCategoryName,
  sku, setSku,
  basePrice, setBasePrice,
  alwaysAvailable, setAlwaysAvailable,
  stock, setStock,
  images, handleImageUpload, handleRemoveImage,
  fileInputRef, submitting, uploadingImage
}: FormRequiredFieldsProps) {

  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false)

  const formatRupiah = (val: number | '') => (val === '' ? '' : val.toLocaleString('id-ID'))
  const parseNumber = (val: string) => Number(val.replace(/\./g, ''))

  // Efek untuk memicu kamera scanner saat modal terbuka
  useEffect(() => {
    if (!isScannerOpen) return

    const scanner = new Html5QrcodeScanner(
      "form-sku-reader",
      { 
        fps: 10, 
        qrbox: { width: 220, height: 220 },
        rememberLastUsedCamera: true
      },
      /* verbose= */ false
    )

    const onScanSuccess = (decodedText: string) => {
      setSku(decodedText.trim())
      setIsScannerOpen(false)
      scanner.clear()
    }

    const onScanFailure = () => {
      // Mengabaikan pemindaian bingkai yang gagal
    }

    scanner.render(onScanSuccess, onScanFailure)

    return () => {
      scanner.clear().catch(err => console.error("Gagal mematikan kamera form", err))
    }
  }, [isScannerOpen, setSku])

  return (
    <div className="space-y-5 animate-fade-in bg-white p-1">
      
      {/* HEADER PENANDA DATA UTAMA */}
      <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
        <span className="w-1.5 h-3.5 bg-red-600 rounded-full"></span>
        <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Informasi Utama (Wajib Diisi)</span>
      </div>

      {/* UPLOAD FOTO ETALASE */}
      <div className="space-y-2.5">
        <div>
          <label className="text-xs font-black text-gray-900 uppercase tracking-wider block">Foto Etalase Produk</label>
          <p className="text-[11px] font-medium text-gray-400 mt-0.5">Maksimal hingga 5 file gambar utama.</p>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          {images.map((img, index) => (
            <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group shadow-sm">
              <img src={img.previewUrl} alt="Produk" className="w-full h-full object-cover" />
              <button 
                type="button" 
                onClick={() => handleRemoveImage(index)} 
                className="absolute inset-0 bg-gray-950/80 text-white font-bold opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-xs backdrop-blur-xs cursor-pointer"
              >
                Hapus
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <button 
              type="button" 
              disabled={submitting || uploadingImage} 
              onClick={() => fileInputRef.current?.click()} 
              className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-500 flex flex-col items-center justify-center text-gray-400 hover:text-red-600 transition-all bg-gray-50/70 hover:bg-red-50/20 active:scale-95 cursor-pointer"
            >
              <svg className="w-5 h-5 mb-0.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-wider">Upload</span>
            </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        </div>
      </div>

      {/* INPUT NAMA PRODUK */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block">
          Nama Produk <span className="text-red-500">*</span>
        </label>
        <input 
          type="text" 
          required 
          className="w-full bg-gray-100 hover:bg-gray-200/60 rounded-xl px-3.5 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:bg-gray-200/80 transition-all border border-transparent focus:border-gray-300 placeholder:text-gray-400 placeholder:font-normal" 
          placeholder="Es Kopi Susu Aren" 
          value={productName} 
          onChange={(e) => setProductName(e.target.value)} 
        />
      </div>

      {/* INPUT KATEGORI */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block">
          Kategori <span className="text-red-500">*</span>
        </label>
        <input 
          type="text" 
          required 
          className="w-full bg-gray-100 hover:bg-gray-200/60 rounded-xl px-3.5 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:bg-gray-200/80 transition-all border border-transparent focus:border-gray-300 placeholder:text-gray-400 placeholder:font-normal" 
          placeholder="Minuman" 
          value={categoryName} 
          onChange={(e) => setCategoryName(e.target.value)} 
        />
      </div>

      {/* INPUT HARGA JUAL */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block">
          Harga Jual Pasar <span className="text-red-500">*</span>
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-xs font-black text-gray-500 z-10 select-none">Rp</span>
          <input 
            type="text" 
            required 
            className="w-full bg-gray-100 hover:bg-gray-200/60 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-black text-gray-950 focus:outline-none focus:bg-gray-200/80 transition-all border border-transparent focus:border-gray-300 placeholder:text-gray-400 placeholder:font-normal" 
            value={formatRupiah(basePrice)} 
            placeholder="0" 
            onChange={(e) => { const num = parseNumber(e.target.value); setBasePrice(num > 0 ? num : '') }} 
          />
        </div>
      </div>
      
      {/* INPUT SKU / BARCODE */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block">SKU / Barcode Kode Unik</label>
        <div className="relative flex items-center">
          <input 
            type="text" 
            className="w-full bg-gray-100 hover:bg-gray-200/60 rounded-xl pl-3.5 pr-11 py-2.5 text-sm font-mono text-gray-800 focus:outline-none focus:bg-gray-200/80 transition-all border border-transparent focus:border-gray-300 placeholder:text-gray-400 placeholder:font-normal" 
            placeholder="Ketik atau scan barcode..." 
            value={sku} 
            onChange={(e) => setSku(e.target.value)} 
          />
          {/* Tombol Ikon Scan Kamera */}
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="absolute right-2 p-1.5 text-gray-500 hover:text-red-600 rounded-lg bg-white/80 hover:bg-white shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Scan Barcode menggunakan Kamera"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* MODERN SWITCH SETTING STOK */}
      <div className="p-4 bg-gray-950 rounded-2xl space-y-4 text-white shadow-sm border border-gray-800">
        <div className="flex items-center justify-between gap-4">
          <div>
            <label className="text-xs font-black text-white uppercase tracking-wider block">Ketersediaan Tanpa Batas</label>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5 leading-relaxed">
              Aktifkan jika produk berupa jasa atau stok digital yang tidak memerlukan jumlah stok fisik.
            </p>
          </div>
          <button 
            type="button" 
            onClick={() => { const next = !alwaysAvailable; setAlwaysAvailable(next); if (next) setStock(''); }} 
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 shrink-0 cursor-pointer ${alwaysAvailable ? 'bg-red-600' : 'bg-gray-700'}`}
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${alwaysAvailable ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {!alwaysAvailable && (
          <div className="space-y-1.5 pt-3 border-t border-gray-800 text-xs animate-fade-in">
            <label className="text-[10px] font-black text-gray-300 uppercase tracking-wider block">
              Jumlah Stok Fisik Gudang <span className="text-red-500">*</span>
            </label>
            <input 
              type="number" 
              required={!alwaysAvailable} 
              min="0" 
              className="w-full bg-gray-100 rounded-xl px-3.5 py-2.5 text-xs font-black text-gray-950 focus:outline-none focus:bg-gray-200 transition-all border-none placeholder:text-gray-400 placeholder:font-normal" 
              placeholder="0" 
              value={stock} 
              onChange={(e) => setStock(e.target.value !== '' ? Number(e.target.value) : '')} 
            />
          </div>
        )}
      </div>

      {/* MODAL SCANNER KAMERA */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden p-5 relative shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-tight">Pindai Barcode Produk</h3>
              <button
                type="button"
                onClick={() => setIsScannerOpen(false)}
                className="text-gray-400 hover:text-gray-700 font-bold text-xs px-2 py-1 rounded-lg hover:bg-gray-100 transition-all active:scale-95 cursor-pointer"
              >
                Batal
              </button>
            </div>
            
            <div id="form-sku-reader" className="w-full overflow-hidden rounded-xl bg-gray-50 border border-gray-100"></div>
            
            <p className="text-[10px] text-center text-gray-400 font-semibold mt-3">
              Arahkan barcode ke area kamera di atas untuk membaca SKU secara otomatis.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}