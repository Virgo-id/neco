'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/utils/supabase'
import ProductForm, { Product } from './ProductForm'

interface ToastMessage {
  id: number
  text: string
  type: 'success' | 'error' | 'warning'
}

interface ConfirmState {
  isOpen: boolean
  title: string
  message: string
}

export default function ProductsPage({
  params,
}: {
  params: Promise<{ marketid: string }>
}) {
  const { marketid } = use(params)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
  })

  useEffect(() => {
    fetchProducts()
  }, [marketid])

  const showToast = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }

  const triggerDeleteConfirmation = (product: Product) => {
    setProductToDelete(product)
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Produk',
      message: `Apakah Anda yakin ingin menghapus produk "${product.product_name}"? Tindakan ini tidak dapat dibatalkan.`,
    })
  }

  const executeDeleteProduct = async () => {
    if (!productToDelete) return

    try {
      if (productToDelete.main_image_url && productToDelete.main_image_url.length > 0) {
        const pathsToDelete = productToDelete.main_image_url.map((url) => {
          const parts = url.split('/')
          return parts[parts.length - 1]
        })

        const { error: storageError } = await supabase.storage
          .from('product-images')
          .remove(pathsToDelete)

        if (storageError) {
          console.error('Gagal membersihkan storage bucket:', storageError)
        }
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id)

      if (error) throw error

      showToast('Produk berhasil dihapus sepenuhnya')
      fetchProducts()
    } catch (err) {
      console.error('Gagal menghapus produk:', err)
      showToast('Gagal menghapus produk, silakan coba kembali', 'error')
    } finally {
      setProductToDelete(null)
      setConfirmModal((prev) => ({ ...prev, isOpen: false }))
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select(
          'id, product_name, main_image_url, category_name, sku, capital_price, base_price, discount_value, always_available, stock, wholesale_prices, variants, gift_config'
        )
        .eq('market_id', marketid)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.error('Gagal memuat produk:', err)
      showToast('Gagal mengambil data dari server', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingProduct(null)
    setIsFormOpen(true)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      setSubmitting(true)

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            ...productData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingProduct.id)

        if (error) throw error
        showToast('Informasi produk berhasil diperbarui')
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            market_id: marketid,
            ...productData,
          })

        if (error) throw error
        showToast('Produk baru berhasil ditambahkan')
      }

      setIsFormOpen(false)
      fetchProducts()
    } catch (err) {
      console.error('Gagal menyimpan produk:', err)
      showToast('Gagal memproses data operasional produk', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 relative max-w-7xl mx-auto px-4 sm:px-6 py-4">

      {/* FIXED CONTAINER TOAST ALERTS */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:right-4 md:translate-x-0 z-[90] space-y-2 w-full max-w-sm px-4 md:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center justify-between p-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-700'
                : toast.type === 'warning'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-black text-white'
            }`}
          >
            <span className="flex-1 pr-2">{toast.text}</span>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-[10px] uppercase opacity-70 hover:opacity-100 font-black tracking-widest bg-white/10 hover:bg-white/20 cursor-pointer px-2 py-1 rounded-md transition-all transform hover:scale-105 active:scale-95"
            >
              Tutup
            </button>
          </div>
        ))}
      </div>

      {/* MODAL FORM PRODUK (TAMBAH & EDIT) */}
      {isFormOpen && (
        <div className="fixed inset-0 h-screen w-screen bg-gray-950/60 z-[80] flex items-center justify-center p-4 left-0 top-0 animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <ProductForm
              editingProduct={editingProduct}
              submitting={submitting}
              onClose={() => setIsFormOpen(false)}
              onSave={handleSaveProduct}
            />
          </div>
        </div>
      )}

      {/* OVERLAY MODAL KONFIRMASI HAPUS */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 h-screen w-screen bg-gray-950/60 z-[85] flex items-center justify-center p-4 left-0 top-0 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 relative">
            <div className="flex items-center gap-2.5 text-red-600 mb-3">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <h4 className="text-sm font-black uppercase tracking-wider">
                {confirmModal.title}
              </h4>
            </div>
            <p className="text-xs font-semibold text-gray-400 leading-relaxed mb-6">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setProductToDelete(null)
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-gray-400 hover:text-gray-950 hover:bg-gray-100 cursor-pointer transition-all transform hover:scale-105 active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteProduct}
                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 shadow-sm hover:shadow"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER ATAS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white rounded-2xl p-4 sm:p-6 gap-4">
        <div>
          {/* TEKS HEADER DIPERBESAR */}
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-950 tracking-tight">
            Katalog Produk Toko
          </h2>
        </div>
        <button
          onClick={openAddModal}
          className="bg-red-600 hover:bg-red-700 text-white cursor-pointer px-5 py-3 rounded-xl text-xs font-black transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 w-full sm:w-auto uppercase tracking-wider shrink-0 shadow-sm hover:shadow"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Produk Baru
        </button>
      </div>

      {/* SEKSI UTAMA KATALOG (GRID CARD RESPONSIF) */}
      <div>
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-xs font-black uppercase tracking-wider text-gray-400 animate-pulse">
            Memuat katalog produk toko...
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center text-xs font-black uppercase tracking-wider text-gray-400 space-y-3">
            <svg className="w-8 h-8 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="normal-case font-bold">Belum ada produk terdaftar di toko ini. Klik tombol tambah di atas.</p>
          </div>
        ) : (
          /* Mobile: 1 Kolom (grid-cols-1) | Desktop: Multi-Kolom (md:grid-cols-2 lg:grid-cols-3) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => {
              const imageUrl =
                product.main_image_url && product.main_image_url.length > 0
                  ? product.main_image_url[0]
                  : 'https://placehold.co/300x300?text=No+Image'

              const hasDiscount = product.discount_value > 0
              const finalPrice = product.base_price - product.discount_value

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl p-3.5 flex flex-col justify-between gap-3 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {/* BAGIAN ATAS: GAMBAR DENGAN KATEGORI (KIRI) & INFORMASI VERTIKAL (KANAN) */}
                  <div className="flex gap-3 items-start">
                    {/* Container Gambar Produk dengan Badge Kategori di Kiri Atas */}
                    <div className="relative shrink-0">
                      <img
                        src={imageUrl}
                        alt={product.product_name}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover bg-gray-50 border border-gray-100"
                      />
                      {/* Label Kategori */}
                      {product.category_name && (
                        <span className="absolute top-1.5 left-1.5 text-[8px] font-black text-gray-800 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded shadow-sm tracking-wider uppercase max-w-[90%] truncate">
                          {product.category_name}
                        </span>
                      )}
                    </div>

                    {/* Informasi Produk - UKURAN TEKS DIPERKECHIL */}
                    <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5 space-y-1.5">
                      <div>
                        {/* SKU (Teks diperkecil ke 9px) */}
                        {product.sku && (
                          <div className="mb-0.5">
                            <span className="text-[9px] text-gray-400 font-mono font-semibold truncate block">
                              {product.sku}
                            </span>
                          </div>
                        )}

                        {/* Nama Produk (Teks diperkecil ke xs / sm) */}
                        <h4 className="font-extrabold text-gray-950 text-xs sm:text-sm tracking-tight line-clamp-2 leading-snug">
                          {product.product_name}
                        </h4>
                      </div>

                      {/* Harga Jual (Teks diperkecil) */}
                      <div>
                        {hasDiscount ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[10px] font-semibold text-gray-400 line-through">
                                Rp {product.base_price.toLocaleString('id-ID')}
                              </span>
                              <span className="text-[8px] font-black bg-red-50 text-red-600 px-1 py-0.2 rounded">
                                -Rp {product.discount_value.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="text-gray-950 font-black text-sm sm:text-base">
                              Rp {finalPrice.toLocaleString('id-ID')}
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-950 font-black text-sm sm:text-base">
                            Rp {product.base_price.toLocaleString('id-ID')}
                          </div>
                        )}
                      </div>

                      {/* Status Stok (Teks diperkecil ke 9px) */}
                      <div>
                        {product.always_available ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] tracking-wider font-black uppercase">
                            Selalu Ready
                          </span>
                        ) : (
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[9px] tracking-wider font-black uppercase ${
                              product.stock > 5
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {product.stock} Pcs
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* BAGIAN BAWAH: TOMBOL EDIT & HAPUS (Teks & Ukuran diperkecil) */}
                  <div className="flex items-center gap-2 pt-2.5 border-t border-gray-100 mt-auto">
                    <button
                      type="button"
                      onClick={() => openEditModal(product)}
                      className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-800 cursor-pointer py-2 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all transform hover:scale-105 active:scale-95"
                    >
                      <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerDeleteConfirmation(product)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer py-2 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all transform hover:scale-105 active:scale-95"
                    >
                      <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Hapus
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}