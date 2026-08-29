'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'

interface CartItem {
  id: string
  product_name: string
  base_price: number
  discount_value: number
  quantity: number
  stock: number
}

interface CartDebtModalProps {
  isOpen: boolean
  onClose: () => void
  marketId: string
  cartItems: CartItem[]
  totalPrice: number
  onSuccess: () => void
}

export default function CartDebtModal({
  isOpen,
  onClose,
  marketId,
  cartItems,
  totalPrice,
  onSuccess,
}: CartDebtModalProps) {
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmitDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim()) {
      alert('Nama pelanggan wajib diisi!')
      return
    }

    try {
      setSubmitting(true)

      // 1. Petakan data keranjang ke format objek JSON untuk kolom 'items' (jsonb)
      const formattedItems = cartItems.map(item => ({
        product_id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.base_price - item.discount_value // Harga bersih setelah diskon
      }))

      // 2. Simpan catatan ke tabel 'debt_records' (Sekarang menyertakan kolom notes)
      const { error: debtError } = await supabase
        .from('debt_records')
        .insert({
          market_id: marketId,
          borrower_name: customerName.trim(),
          items: formattedItems,
          total_amount: totalPrice,
          status: 'unpaid',
          notes: notes.trim() || null // <--- SEKARANG IKUT DISIMPAN KE DATABASE
        })

      if (debtError) throw debtError

      // 3. Potong stok produk yang ada di keranjang belanja
      for (const item of cartItems) {
        if (item.stock >= 0) {
          const { error: stockError } = await supabase
            .from('products')
            .update({ stock: item.stock - item.quantity })
            .eq('id', item.id)

          if (stockError) {
            console.error(`Gagal perbarui stok ${item.id}:`, stockError.message)
          }
        }
      }

      alert('Hutang dan detail produk berhasil dicatat!')
      
      // Reset form & trigger callback sukses
      setCustomerName('')
      setNotes('')
      onClose()
      onSuccess()

    } catch (err: any) {
      console.error('Gagal mencatat hutang:', err)
      alert(`Terjadi kesalahan: ${err?.message || 'Gagal menyimpan data'}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 animate-fade-in">
      <div className="absolute inset-0" onClick={submitting ? undefined : onClose} />

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative z-10 border border-gray-100 animate-scale-in">
        
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-gray-950 uppercase tracking-tight">Catat Sebagai Hutang</h3>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5">Simpan total keranjang ke catatan hutang</p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100/60 flex justify-between items-center">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Total Hutang</span>
          <span className="text-base font-black text-amber-600">
            Rp {totalPrice.toLocaleString('id-ID')}
          </span>
        </div>

        <form onSubmit={handleSubmitDebt} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Nama Pelanggan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={submitting}
              placeholder="Masukkan nama pelanggan..."
              className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 border border-transparent focus:border-amber-500 transition-all"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Catatan Tambahan (Opsional)</label>
            <textarea
              rows={3}
              disabled={submitting}
              placeholder="Contoh: Jatuh tempo akhir bulan, nomor HP, dll..."
              className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 border border-transparent focus:border-amber-500 transition-all resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl text-xs font-black transition-all active:scale-[0.99]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 text-white disabled:text-gray-400 py-2.5 rounded-xl text-xs font-black transition-all enabled:active:scale-[0.99] flex items-center justify-center gap-1.5"
            >
              {submitting ? 'Menyimpan...' : 'Konfirmasi Hutang'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}