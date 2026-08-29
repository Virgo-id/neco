'use client'

import { useState, useEffect, use, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import TransactionHistoryModal from './TransactionHistoryModal'
import DebtRecordModal from './DebtRecordModal'
import CartDebtModal from './CartDebtModal'

interface Product {
  id: string
  product_name: string
  sku: string
  base_price: number
  discount_value: number
  stock: number
  main_image_url: any[]
}

interface CartItem extends Product {
  quantity: number
}

export default function CashierPage({
  params,
}: {
  params: Promise<{ marketid: string }>
}) {
  const { marketid } = use(params)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [showImages, setShowImages] = useState<boolean>(true)
  const [cashInput, setCashInput] = useState<string>('')
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false)
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false)

  // State Kontrol Modal
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false)
  const [isDebtOpen, setIsDebtOpen] = useState<boolean>(false)
  const [isDebtCheckoutOpen, setIsDebtCheckoutOpen] = useState<boolean>(false)

  // Klik di luar untuk menutup dropdown template uang dan menu hamburger
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTemplateOpen(false)
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (marketid) {
      fetchProducts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketid])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('id, product_name, sku, base_price, discount_value, stock, main_image_url')
        .eq('market_id', marketid)
        .eq('is_active', true)
        .order('product_name', { ascending: true })

      if (error) throw error
      setProducts(data || [])
    } catch (err: any) {
      console.error('--- DETAIL ERROR ---', err?.message || err)
      alert(`Gagal mengambil data produk: ${err?.message || 'Terjadi kesalahan'}`)
    } finally {
      setLoading(false)
    }
  }

  // Menangani input otomatis dari Alat Barcode Scanner (Event Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()

      const targetCode = searchQuery.trim().toLowerCase()
      if (!targetCode) return

      const matchedProduct = products.find(
        (p) =>
          (p.sku && p.sku.toLowerCase() === targetCode) ||
          p.product_name.toLowerCase() === targetCode
      )

      if (matchedProduct) {
        addToCart(matchedProduct)
        setSearchQuery('')
      } else {
        alert(`Produk dengan SKU/Nama "${searchQuery}" tidak ditemukan atau stok kosong!`)
      }
    }
  }

  // Helper Format & Parse Rupiah
  const formatRupiah = (val: string): string => {
    const num = val.replace(/\D/g, '')
    if (!num) return ''
    return Number(num).toLocaleString('id-ID')
  }

  const parseNumber = (val: string): number => {
    return Number(val.replace(/\./g, '')) || 0
  }

  const filteredProducts = products.filter(
    (product) =>
      (product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()))) &&
      product.stock !== 0
  )

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id)

      if (existingItem) {
        if (product.stock >= 0 && existingItem.quantity >= product.stock) {
          alert('Stok produk tidak mencukupi!')
          return prevCart
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }

      return [...prevCart, { ...product, quantity: 1 }]
    })
  }

  const updateQuantity = (id: string, amount: number, maxStock: number) => {
    setCart((prevCart) => {
      const updated = prevCart
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + amount
            if (maxStock >= 0 && newQty > maxStock) {
              alert('Stok tidak mencukupi!')
              return item
            }
            return { ...item, quantity: newQty }
          }
          return item
        })
        .filter((item) => item.quantity > 0)

      if (updated.length === 0) {
        setIsMobileCartOpen(false)
      }
      return updated
    })
  }

  const totalPrice = cart.reduce((sum, item) => {
    const finalPrice = Number(item.base_price) - Number(item.discount_value)
    return sum + finalPrice * item.quantity
  }, 0)

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const cashReceivedValue = parseNumber(cashInput)
  const change = cashReceivedValue > 0 ? cashReceivedValue - totalPrice : 0

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (cashReceivedValue < totalPrice) {
      alert('Uang tunai yang diterima kurang!')
      return
    }

    try {
      setSubmitting(true)

      // 1. Simpan Transaksi Utama
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert({
          market_id: marketid,
          total_price: totalPrice,
          status: 'success',
        })
        .select('id')
        .single()

      if (txError) throw txError

      // 2. Simpan Item Transaksi (transaction_items)
      if (txData?.id) {
        const transactionItems = cart.map((item) => {
          const finalPrice = Number(item.base_price) - Number(item.discount_value)
          return {
            transaction_id: txData.id,
            product_id: item.id,
            product_name: item.product_name,
            quantity: item.quantity,
            price_per_unit: finalPrice,
            subtotal: finalPrice * item.quantity,
          }
        })

        const { error: itemsError } = await supabase
          .from('transaction_items')
          .insert(transactionItems)

        if (itemsError) console.error('Gagal simpan item transaksi:', itemsError.message)
      }

      // 3. Potong Stok Produk
      for (const item of cart) {
        if (item.stock >= 0) {
          const { error: stockError } = await supabase
            .from('products')
            .update({ stock: item.stock - item.quantity })
            .eq('id', item.id)

          if (stockError) console.error(`Gagal perbarui stok ${item.id}:`, stockError.message)
        }
      }

      alert('Transaksi Berhasil Disimpan!')
      setCart([])
      setCashInput('')
      setIsMobileCartOpen(false)
      fetchProducts()
    } catch (err: any) {
      console.error('Gagal checkout:', err)
      alert(`Terjadi kesalahan checkout: ${err?.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const selectTemplateMoney = (nominal: number) => {
    setCashInput(nominal.toString())
    setIsTemplateOpen(false)
  }

  const renderCartItemsList = () => (
    <div className="overflow-y-auto flex-1 divide-y divide-gray-100 min-h-[180px] px-4">
      {cart.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs py-8 text-center">
          <span>
            Keranjang masih kosong.
            <br />
            Klik produk untuk menambahkan.
          </span>
        </div>
      ) : (
        cart.map((item) => {
          const basePrice = Number(item.base_price)
          const discountValue = Number(item.discount_value)
          const hasDiscount = discountValue > 0
          const finalPrice = basePrice - discountValue

          return (
            <div key={item.id} className="py-3 flex justify-between items-center gap-4 first:pt-0 last:pb-0">
              <div className="truncate flex-1">
                <h5 className="text-xs font-bold text-gray-900 truncate">{item.product_name}</h5>
                {hasDiscount ? (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium text-gray-400 line-through">
                      Rp {basePrice.toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs text-gray-900 font-bold">
                      Rp {finalPrice.toLocaleString('id-ID')}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">
                    Rp {basePrice.toLocaleString('id-ID')}
                  </span>
                )}
              </div>

              <div className="flex items-center rounded-xl overflow-hidden shrink-0 bg-gray-50">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, -1, item.stock)}
                  className="px-2.5 py-1 text-gray-500 hover:bg-gray-200 font-bold text-xs transition-colors"
                >
                  -
                </button>
                <span className="px-1 text-xs font-bold text-gray-900 w-8 text-center">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, 1, item.stock)}
                  className="px-2.5 py-1 text-gray-500 hover:bg-gray-200 font-bold text-xs transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  const renderPaymentFormSection = () => {
    const templates = [totalPrice, 10000, 20000, 50000, 100000].filter((val) => val >= totalPrice && val > 0)
    const uniqueTemplates = Array.from(new Set(templates))

    return (
      <div className="p-4 bg-gray-50 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Tagihan</span>
          <span className="text-lg font-black text-gray-950">
            Rp {totalPrice.toLocaleString('id-ID')}
          </span>
        </div>

        <div className="space-y-1.5 relative" ref={dropdownRef}>
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Uang Tunai (Rp)</label>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => setIsTemplateOpen(!isTemplateOpen)}
              className="text-[10px] font-black text-red-600 hover:text-red-700 disabled:text-gray-400 uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              Template Uang
              <svg
                className={`w-3 h-3 transform transition-transform duration-200 ${
                  isTemplateOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>

          {isTemplateOpen && (
            <div className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-xl z-50 py-1.5 overflow-hidden flex flex-col divide-y divide-gray-50 animate-fade-in shadow-lg">
              <span className="px-3 py-1 text-[9px] font-black text-gray-400 uppercase tracking-wider block bg-gray-50/50">
                Pilih Uang Cepat
              </span>
              {uniqueTemplates.map((money) => (
                <button
                  key={money}
                  type="button"
                  onClick={() => selectTemplateMoney(money)}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-all flex justify-between items-center"
                >
                  <span>Rp {money.toLocaleString('id-ID')}</span>
                  {money === totalPrice && (
                    <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded uppercase">
                      Uang Pas
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="relative flex items-center">
            <span className="absolute left-3 text-sm font-bold text-gray-400">Rp</span>
            <input
              type="text"
              className="w-full bg-white rounded-xl pl-9 pr-3.5 py-2.5 text-sm font-black text-gray-900 focus:outline-none transition-all border border-gray-200 focus:border-red-500"
              placeholder="0"
              value={formatRupiah(cashInput)}
              onChange={(e) => setCashInput(e.target.value.replace(/\D/g, ''))}
              disabled={cart.length === 0}
            />
          </div>
        </div>

        {cashReceivedValue > 0 && (
          <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
            <span className="text-xs font-bold text-gray-500">Kembalian</span>
            <span className={`text-sm font-black ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {change >= 0 ? `Rp ${change.toLocaleString('id-ID')}` : 'Uang Kurang!'}
            </span>
          </div>
        )}

        {/* CONTROLLER ACTION BUTTONS */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0 || cashReceivedValue < totalPrice || submitting}
            className="w-full bg-red-600 disabled:bg-gray-200 text-white disabled:text-gray-400 py-3 rounded-xl text-sm font-black transition-all enabled:hover:bg-red-700 enabled:active:scale-[0.99]"
          >
            {submitting ? 'Memproses...' : 'Selesaikan Transaksi'}
          </button>

          <button
            type="button"
            onClick={() => setIsDebtCheckoutOpen(true)}
            disabled={cart.length === 0 || submitting}
            className="w-full bg-amber-500 disabled:bg-gray-200 text-white disabled:text-gray-400 py-2.5 rounded-xl text-xs font-black transition-all enabled:hover:bg-amber-600 enabled:active:scale-[0.99] flex items-center justify-center gap-1.5 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            Catat Sebagai Hutang
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-full pb-12 lg:pb-0">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* SISI KIRI: DAFTAR PRODUK */}
        <div className="lg:col-span-2 space-y-4">
          {/* BAR PENCARIAN & HAMBURGER MENU */}
          <div className="flex gap-3 items-center">
            <div className="flex-1 bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
              <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari produk atau scan barcode..."
                className="w-full bg-transparent text-sm font-medium focus:outline-none text-gray-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>

            {/* HAMBURGER DROPDOWN */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-4 bg-white hover:bg-gray-50 rounded-2xl transition-all shadow-sm flex items-center justify-center border ${
                  isMenuOpen ? 'border-red-200 text-red-600 bg-red-50/30' : 'border-transparent text-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl z-50 border border-gray-100 py-2 origin-top-right animate-fade-in">
                  <span className="px-4 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider block">Fitur Toko</span>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false)
                      setIsHistoryOpen(true)
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Riwayat Transaksi
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false)
                      setIsDebtOpen(true)
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Catatan Hutang
                  </button>

                  <div className="border-t border-gray-100 my-1"></div>

                  <span className="px-4 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                    Pengaturan Tampilan
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowImages(true)}
                    className={`w-full px-4 py-2 text-left text-xs font-bold transition-colors flex items-center justify-between ${
                      showImages ? 'text-red-600 bg-red-50/40' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>Dengan Gambar</span>
                    {showImages && <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowImages(false)}
                    className={`w-full px-4 py-2 text-left text-xs font-bold transition-colors flex items-center justify-between ${
                      !showImages ? 'text-red-600 bg-red-50/40' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>Tanpa Gambar</span>
                    {!showImages && <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>}
                  </button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-[280px]"></div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl py-16 text-center text-gray-400 text-sm border border-gray-100">
              Produk tidak ditemukan atau stok kosong.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const basePrice = Number(product.base_price)
                const discountValue = Number(product.discount_value)
                const hasDiscount = discountValue > 0
                const finalPrice = basePrice - discountValue
                const imageUrl =
                  Array.isArray(product.main_image_url) && product.main_image_url.length > 0
                    ? product.main_image_url[0]
                    : null

                const cartItem = cart.find((item) => item.id === product.id)
                const isInCart = !!cartItem
                const quantityInCart = cartItem ? cartItem.quantity : 0

                return (
                  <div
                    key={product.id}
                    className={`group rounded-2xl text-left transition-all flex flex-col p-2 border relative ${
                      isInCart
                        ? 'bg-red-50/70 border-red-200 ring-1 ring-red-200'
                        : 'bg-white border-transparent'
                    }`}
                  >
                    {showImages && (
                      <div
                        className="w-full aspect-square bg-gray-50 shrink-0 relative overflow-hidden cursor-pointer rounded-xl border border-gray-100/80"
                        onClick={() => addToCart(product)}
                      >
                        {imageUrl && typeof imageUrl === 'string' ? (
                          <img
                            src={imageUrl}
                            alt={product.product_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[11px] text-gray-400 font-medium bg-gray-100/70">
                            Tidak ada gambar
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className="flex flex-col justify-between flex-1 w-full pt-2.5 px-1 cursor-pointer"
                      onClick={() => addToCart(product)}
                    >
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm line-clamp-2 group-hover:text-red-600 transition-colors">
                          {product.product_name}
                        </h4>
                        <span className="text-xs text-gray-400 font-semibold">
                          Stok: {product.stock < 0 ? '∞ Tersedia' : `${product.stock} pcs`}
                        </span>
                      </div>

                      <div className="mt-2">
                        {hasDiscount ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-medium text-gray-400 line-through">
                                Rp {basePrice.toLocaleString('id-ID')}
                              </span>
                              <span className="text-[9px] font-black bg-red-50 text-red-600 px-1 py-0.25 rounded">
                                -{discountValue.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="font-black text-gray-950 text-sm">
                              Rp {finalPrice.toLocaleString('id-ID')}
                            </div>
                          </div>
                        ) : (
                          <span className="font-black text-gray-950 text-sm">
                            Rp {basePrice.toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 shrink-0">
                      {isInCart ? (
                        <div className="flex items-center justify-between rounded-xl overflow-hidden bg-white border border-red-200 w-full shadow-sm">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, -1, product.stock)}
                            className="px-3 py-1.5 text-red-600 hover:bg-red-50 font-black text-sm transition-colors flex-1 text-center"
                          >
                            -
                          </button>
                          <span className="px-1 text-xs font-black text-gray-900 w-8 text-center bg-gray-50/50 py-1.5 border-x border-red-100">
                            {quantityInCart}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, 1, product.stock)}
                            className="px-3 py-1.5 text-red-600 hover:bg-red-50 font-black text-sm transition-colors flex-1 text-center"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          className="w-full py-1.5 rounded-xl text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200/60 hover:text-red-600 hover:bg-red-50 hover:border-red-200 text-center transition-all block"
                        >
                          Tambah
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* SISI KANAN: KERANJANG DESKTOP */}
        <div className="hidden lg:flex bg-white rounded-2xl overflow-hidden sticky top-24 flex-col max-h-[calc(100vh-120px)] shadow-sm border border-gray-100">
          <div className="p-4 bg-gray-50/70 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Item Keranjang</h3>
          </div>
          <div className="pt-4 flex-1 overflow-y-auto">{renderCartItemsList()}</div>
          {renderPaymentFormSection()}
        </div>
      </div>

      {/* --- STRUKTUR UI MOBILE --- */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-3 flex items-center justify-between z-40 lg:hidden shadow-lg border-t border-gray-100">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Total ({totalItems} Item)
            </span>
            <span className="text-base font-black text-gray-950">
              Rp {totalPrice.toLocaleString('id-ID')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all"
          >
            Tinjau Keranjang
          </button>
        </div>
      )}

      {isMobileCartOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 lg:hidden transition-opacity"
          onClick={() => setIsMobileCartOpen(false)}
        />
      )}

      <div
        className={`
        fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 lg:hidden max-h-[85vh] flex flex-col transition-transform duration-300 ease-in-out transform
        ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full'}
      `}
      >
        <div className="p-4 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl border-b border-gray-50">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-gray-950 uppercase tracking-tight">Detail Keranjang</h3>
            <span className="bg-red-50 text-red-600 text-[11px] font-black px-2 py-0.5 rounded-full">
              {totalItems} item
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(false)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pt-4">{renderCartItemsList()}</div>

        {renderPaymentFormSection()}
      </div>

      {/* MODAL SECTION OVERLAYS */}
      <TransactionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        marketId={marketid}
      />

      <DebtRecordModal
        isOpen={isDebtOpen}
        onClose={() => setIsDebtOpen(false)}
        marketId={marketid}
      />

      <CartDebtModal
        isOpen={isDebtCheckoutOpen}
        onClose={() => setIsDebtCheckoutOpen(false)}
        marketId={marketid}
        cartItems={cart}
        totalPrice={totalPrice}
        onSuccess={() => {
          setCart([])
          setCashInput('')
          setIsMobileCartOpen(false)
          fetchProducts()
        }}
      />
    </div>
  )
}