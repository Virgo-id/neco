'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingCart,
  Trash2,
  X,
  Plus,
  Minus,
  Store,
  Truck,
  FileText,
  Banknote,
  HandCoins,
  ShieldCheck,
  Check
} from 'lucide-react'
import { Product } from './ProductCard'

export interface CheckoutData {
  serviceType: 'pickup' | 'delivery'
  paymentMethod: 'tunai' | 'cod'
  productNotes: Record<string, string>
  serviceFee: number
  grandTotal: number
}

interface CartModalProps {
  isOpen: boolean
  onClose: () => void
  marketName: string
  cartProducts: Product[]
  cart: Record<string, number>
  totalCartItems: number
  totalCartPrice: number
  onUpdateQuantity: (productId: string, delta: number) => void
  onClearCart: () => void
  getMediaUrl?: (path: string | null, bucket: string) => string | null
  formatRupiah: (amount: number) => string
  onCheckout?: (checkoutData: CheckoutData) => void
}

export default function CartModal({
  isOpen,
  onClose,
  marketName,
  cartProducts,
  cart,
  totalCartItems,
  totalCartPrice,
  onUpdateQuantity,
  onClearCart,
  formatRupiah,
  onCheckout
}: CartModalProps) {
  const [serviceType, setServiceType] = useState<'pickup' | 'delivery'>('pickup')
  const [paymentMethod, setPaymentMethod] = useState<'tunai' | 'cod'>('tunai')

  const [productNotes, setProductNotes] = useState<Record<string, string>>({})
  const [activeNoteProduct, setActiveNoteProduct] = useState<Product | null>(null)
  const [tempNote, setTempNote] = useState('')

  const MAX_NOTE_LENGTH = 150

  const serviceFee = paymentMethod === 'tunai' ? 1000 : 4000
  const originalFee = 4000
  const grandTotal = cartProducts.length > 0 ? totalCartPrice + serviceFee : 0

  // Kunci scroll background saat modal terbuka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Fitur Tutup Modal dengan Tombol Escape (Keyboard UX)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeNoteProduct) {
          setActiveNoteProduct(null)
        } else if (isOpen) {
          onClose()
        }
      }
    },
    [isOpen, activeNoteProduct, onClose]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleSaveNote = () => {
    if (activeNoteProduct) {
      setProductNotes((prev) => ({
        ...prev,
        [activeNoteProduct.id]: tempNote.trim()
      }))
    }
    setActiveNoteProduct(null)
  }

  const handleRemoveNote = () => {
    if (activeNoteProduct) {
      setProductNotes((prev) => {
        const newNotes = { ...prev }
        delete newNotes[activeNoteProduct.id]
        return newNotes
      })
    }
    setActiveNoteProduct(null)
  }

  const handleCheckoutSubmit = () => {
    const data: CheckoutData = {
      serviceType,
      paymentMethod,
      productNotes,
      serviceFee,
      grandTotal
    }

    if (onCheckout) {
      onCheckout(data)
    } else {
      const selectedServiceText = serviceType === 'pickup' ? 'Ambil Sendiri' : 'Layanan Antar'
      const selectedPaymentText = paymentMethod === 'tunai' ? 'Tunai / QRIS' : 'Bayar di Tempat'
      alert(
        `Melanjutkan pesanan (${selectedServiceText}) via ${selectedPaymentText}. Total: ${formatRupiah(grandTotal)}`
      )
    }
    onClose()
  }

  const formatNotePreview = (note: string) => {
    if (!note) return ''
    const lines = note.split('\n')
    return lines.length > 1 ? `${lines[0]}...` : lines[0]
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay Main Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 animate-in fade-in duration-200"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-modal-title"
      >
        <div
          className="bg-white w-[360px] h-[85vh] max-h-[640px] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3.5 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-red-50 p-1.5 rounded-lg text-red-600">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 id="cart-modal-title" className="text-xs font-black text-gray-900 leading-tight">
                  Keranjang Belanja
                </h3>
                <p className="text-[10px] text-gray-400 leading-tight">
                  {marketName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {cartProducts.length > 0 && (
                <button
                  onClick={onClearCart}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Kosongkan keranjang"
                  type="button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                type="button"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body: Item List */}
          <div className="p-3.5 overflow-y-auto space-y-2 flex-1 divide-y divide-gray-50 scroll-smooth">
            {cartProducts.length > 0 ? (
              cartProducts.map((prod) => {
                const qty = cart[prod.id] || 0
                const itemPrice = (prod.base_price || 0) * qty
                const note = productNotes[prod.id]

                return (
                  <div
                    key={prod.id}
                    className="pt-2.5 first:pt-0 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate leading-tight">
                        {prod.product_name}
                      </p>
                      <p className="text-[11px] font-bold text-red-600 leading-tight mt-0.5">
                        {formatRupiah(itemPrice)}
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveNoteProduct(prod)
                          setTempNote(productNotes[prod.id] || '')
                        }}
                        className={`mt-1 flex items-center gap-1 text-[10px] font-medium transition-colors max-w-full truncate ${
                          note
                            ? 'text-red-600 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded-md'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <FileText className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {note ? `Catatan: ${formatNotePreview(note)}` : '+ Catatan'}
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg p-0.5 shrink-0 mt-0.5">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(prod.id, -1)}
                        className="w-5 h-5 rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors"
                        aria-label="Kurangi jumlah"
                      >
                        <Minus className="w-2.5 h-2.5 stroke-[3]" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center text-gray-800">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(prod.id, 1)}
                        className="w-5 h-5 rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors"
                        aria-label="Tambah jumlah"
                      >
                        <Plus className="w-2.5 h-2.5 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs py-8">
                Keranjang belanja kosong.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 border-t border-gray-100 bg-gray-50/50 space-y-3 shrink-0">
            {/* Opsi Metode Pengambilan */}
            <div className="grid grid-cols-2 gap-1.5 bg-gray-200/60 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setServiceType('pickup')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  serviceType === 'pickup'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Ambil Sendiri</span>
              </button>
              <button
                type="button"
                onClick={() => setServiceType('delivery')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  serviceType === 'delivery'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Layanan Antar</span>
              </button>
            </div>

            {/* Opsi Pembayaran */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('tunai')}
                className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[11px] font-bold transition-all ${
                  paymentMethod === 'tunai'
                    ? 'bg-red-50/50 border-red-500 text-red-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {paymentMethod === 'tunai' && (
                  <span className="absolute top-1 right-1 text-red-600">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
                <Banknote className="w-4 h-4 mb-0.5 text-emerald-600" />
                <span>Tunai / QRIS</span>
                <span className="text-[9px] text-emerald-600 font-extrabold mt-0.5">
                  Hemat Rp 3.000
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[11px] font-bold transition-all ${
                  paymentMethod === 'cod'
                    ? 'bg-red-50/50 border-red-500 text-red-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {paymentMethod === 'cod' && (
                  <span className="absolute top-1 right-1 text-red-600">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
                <HandCoins className="w-4 h-4 mb-0.5 text-amber-600" />
                <span>Bayar di Tempat</span>
                <span className="text-[9px] text-gray-400 font-medium mt-0.5">
                  Biaya Reguler
                </span>
              </button>
            </div>

            {/* Ringkasan */}
            <div className="space-y-1 pt-1 border-t border-gray-200/60">
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Subtotal ({totalCartItems} item)</span>
                <span className="font-semibold text-gray-800">
                  {formatRupiah(totalCartPrice)}
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-gray-400" /> Biaya Layanan
                </span>
                <div className="flex items-center gap-1.5">
                  {paymentMethod === 'tunai' && cartProducts.length > 0 && (
                    <span className="line-through text-gray-400 text-[10px]">
                      {formatRupiah(originalFee)}
                    </span>
                  )}
                  <span className={`font-semibold ${paymentMethod === 'tunai' ? 'text-emerald-600' : 'text-gray-800'}`}>
                    {formatRupiah(cartProducts.length > 0 ? serviceFee : 0)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-gray-900 font-black">Total Pembayaran</span>
                <span className="text-base font-black text-red-600">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>

            <button
              onClick={handleCheckoutSubmit}
              disabled={cartProducts.length === 0}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black py-2.5 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
              type="button"
            >
              Lanjut Pesan
            </button>
          </div>
        </div>
      </div>

      {/* Modal Input Catatan */}
      {activeNoteProduct && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150"
          onClick={() => setActiveNoteProduct(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white w-[360px] max-w-full rounded-2xl p-4 shadow-2xl space-y-3 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="text-xs font-black text-gray-900 truncate pr-2">
                Catatan: {activeNoteProduct.product_name}
              </h4>
              <button
                type="button"
                onClick={() => setActiveNoteProduct(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <textarea
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleSaveNote()
                  }
                }}
                maxLength={MAX_NOTE_LENGTH}
                placeholder="Contoh:&#10;- Pedas sedang&#10;- Tanpa daun bawang"
                rows={3}
                className="w-full text-xs p-3 pb-6 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none text-gray-800 placeholder-gray-400 leading-relaxed"
                autoFocus
              />
              <div className="absolute bottom-2.5 right-3 text-[10px] text-gray-400 font-medium pointer-events-none">
                {tempNote.length}/{MAX_NOTE_LENGTH}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {productNotes[activeNoteProduct.id] && (
                <button
                  type="button"
                  onClick={handleRemoveNote}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors mr-auto"
                >
                  Hapus
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveNoteProduct(null)}
                className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-3.5 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-xs"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}