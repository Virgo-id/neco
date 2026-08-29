'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

interface CartProductItem {
  product_id: string
  product_name: string
  quantity: number
  price: number
}

interface DebtRecord {
  id: string
  borrower_name: string
  items: CartProductItem[]
  total_amount: number
  paid_amount: number
  due_date: string | null
  notes: string | null
  status: 'unpaid' | 'partially_paid' | 'paid'
  created_at: string
}

interface DebtRecordModalProps {
  isOpen: boolean
  onClose: () => void
  marketId: string
}

export default function DebtRecordModal({
  isOpen,
  onClose,
  marketId,
}: DebtRecordModalProps) {
  const [debts, setDebts] = useState<DebtRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddingDebt, setIsAddingDebt] = useState(false)
  
  // State baru untuk menampung record yang ingin dilihat rincian detailnya
  const [selectedDebtDetail, setSelectedDebtDetail] = useState<DebtRecord | null>(null)

  // Form states untuk input hutang manual baru
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // States untuk pembayaran hutang (angsuran/pelunasan)
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null)
  const [payAmountInput, setPayAmountInput] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchDebts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, marketId])

  // Reset tampilan dalam sub-panel saat modal ditutup/dibuka kembali
  useEffect(() => {
    if (!isOpen) {
      setIsAddingDebt(false)
      setSelectedDebtDetail(null)
      setPayingDebtId(null)
    }
  }, [isOpen])

  const fetchDebts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('debt_records')
        .select('id, borrower_name, items, total_amount, paid_amount, due_date, notes, status, created_at')
        .eq('market_id', marketId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDebts(data || [])
      
      // Sinkronkan ulang data detail jika sedang terbuka saat ada mutasi pembayaran
      if (selectedDebtDetail) {
        const updatedDetail = data?.find(d => d.id === selectedDebtDetail.id)
        if (updatedDetail) setSelectedDebtDetail(updatedDetail)
      }
    } catch (err: any) {
      console.error('Gagal mengambil catatan hutang:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountVal = Number(newAmount.replace(/\D/g, ''))
    if (!newCustomerName.trim() || amountVal <= 0) return

    try {
      setSubmitting(true)
      const { error } = await supabase
        .from('debt_records')
        .insert({
          market_id: marketId,
          borrower_name: newCustomerName.trim(),
          items: [], 
          total_amount: amountVal,
          paid_amount: 0,
          due_date: newDueDate || null,
          notes: newNotes.trim() || null,
          status: 'unpaid'
        })

      if (error) throw error

      alert('Catatan hutang berhasil ditambahkan!')
      setNewCustomerName('')
      setNewAmount('')
      setNewDueDate('')
      setNewNotes('')
      setIsAddingDebt(false)
      fetchDebts()
    } catch (err: any) {
      console.error('Gagal menambah hutang:', err.message)
      alert('Terjadi kesalahan saat menyimpan data.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayDebt = async (debt: DebtRecord) => {
    const payVal = Number(payAmountInput.replace(/\D/g, ''))
    if (payVal <= 0) return

    const totalPaidNow = (debt.paid_amount || 0) + payVal
    let finalStatus: 'unpaid' | 'partially_paid' | 'paid' = 'partially_paid'

    if (totalPaidNow >= debt.total_amount) {
      finalStatus = 'paid'
    }

    try {
      setSubmitting(true)
      const { error } = await supabase
        .from('debt_records')
        .update({
          paid_amount: Math.min(totalPaidNow, debt.total_amount),
          status: finalStatus
        })
        .eq('id', debt.id)

      if (error) throw error

      alert('Pembayaran berhasil dicatat!')
      setPayingDebtId(null)
      setPayAmountInput('')
      fetchDebts()
    } catch (err: any) {
      console.error('Gagal mencatat pembayaran:', err.message)
      alert('Gagal memperbarui data pembayaran.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredDebts = debts.filter((d) =>
    d.borrower_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toRupiah = (val: number) => `Rp ${(val || 0).toLocaleString('id-ID')}`

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/77 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* HEADER MODAL */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-base font-black text-gray-900">
              {selectedDebtDetail ? 'Rincian Detail Hutang' : 'Catatan Hutang Pelanggan'}
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              {selectedDebtDetail ? `Melihat data rincian kasbon dari ${selectedDebtDetail.borrower_name}` : 'Kelola piutang dan kasbon toko'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* INPUT BAR & ACTION BUTTON (Hanya muncul jika tidak sedang membuka sub-detail) */}
        {!selectedDebtDetail && (
          <div className="p-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row gap-3 shrink-0 justify-between items-center">
            <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center gap-2 border border-transparent focus-within:border-gray-200 w-full sm:max-w-xs">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Cari nama pelanggan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs font-medium focus:outline-none w-full text-gray-900"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAddingDebt(!isAddingDebt)}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
            >
              {isAddingDebt ? 'Kembali ke Daftar' : 'Catat Hutang Baru'}
            </button>
          </div>
        )}

        {/* KONTEN UTAMA */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
          {selectedDebtDetail ? (
            /* =========================================================
               TAMPILAN SUB-MODAL BARU: RINCIAN DETAIL DATA HUTANG
               ========================================================= */
            <div className="space-y-4 py-2 max-w-xl mx-auto animate-fade-in">
              <button
                type="button"
                onClick={() => setSelectedDebtDetail(null)}
                className="text-xs font-black text-amber-600 hover:text-amber-700 flex items-center gap-1 mb-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke Daftar Pelanggan
              </button>

              <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="text-sm font-black text-gray-950">{selectedDebtDetail.borrower_name}</h4>
                    <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                      Dibuat pada: {new Date(selectedDebtDetail.created_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                    selectedDebtDetail.status === 'paid' 
                      ? 'bg-gray-100 text-gray-500' 
                      : selectedDebtDetail.status === 'partially_paid' 
                      ? 'bg-orange-50 text-orange-600' 
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {selectedDebtDetail.status === 'paid' ? 'Lunas' : selectedDebtDetail.status === 'partially_paid' ? 'Dicicil' : 'Belum Bayar'}
                  </span>
                </div>

                {/* Ringkasan Finansial */}
                <div className="grid grid-cols-2 gap-3 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Total Hutang</span>
                    <span className="text-sm font-black text-gray-900">{toRupiah(selectedDebtDetail.total_amount)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Sisa Pembayaran</span>
                    <span className={`text-sm font-black ${selectedDebtDetail.status === 'paid' ? 'text-gray-400' : 'text-red-600'}`}>
                      {toRupiah(selectedDebtDetail.total_amount - (selectedDebtDetail.paid_amount || 0))}
                    </span>
                  </div>
                  {selectedDebtDetail.paid_amount > 0 && (
                    <div className="col-span-2 pt-1 border-t border-dashed border-gray-200">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Total Terbayar (Cicilan)</span>
                      <span className="text-xs font-bold text-emerald-600">{toRupiah(selectedDebtDetail.paid_amount)}</span>
                    </div>
                  )}
                </div>

                {/* Keterangan Jatuh Tempo & Catatan */}
                {(selectedDebtDetail.due_date || selectedDebtDetail.notes) && (
                  <div className="space-y-2 text-xs border-t border-gray-100 pt-3">
                    {selectedDebtDetail.due_date && (
                      <p className="text-gray-600 font-medium">
                        📅 <span className="font-bold">Batas Jatuh Tempo:</span> {new Date(selectedDebtDetail.due_date).toLocaleDateString('id-ID')}
                      </p>
                    )}
                    {selectedDebtDetail.notes && (
                      <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-3 text-amber-800">
                        <span className="text-[9px] font-black uppercase tracking-wider block mb-0.5">Catatan Toko:</span>
                        <p className="font-medium italic">{selectedDebtDetail.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Rincian Produk Belanjaan */}
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Rincian Barang Belanjaan</span>
                  {selectedDebtDetail.items && selectedDebtDetail.items.length > 0 ? (
                    <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 overflow-hidden text-xs">
                      {selectedDebtDetail.items.map((item, index) => (
                        <div key={index} className="p-2.5 flex justify-between items-center gap-4 bg-gray-50/30">
                          <div>
                            <span className="font-bold text-gray-900 block">{item.product_name}</span>
                            <span className="text-[10px] font-semibold text-gray-400">Harga Satuan: {toRupiah(item.price)}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-gray-500 font-bold block">x{item.quantity}</span>
                            <span className="font-black text-gray-900">{toRupiah(item.price * item.quantity)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-xl text-gray-400 text-xs font-medium border border-dashed border-gray-200">
                      Dicatat secara manual (tidak ada rincian item barang).
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : isAddingDebt ? (
            /* FORM TAMBAH HUTANG MANUAL */
            <form onSubmit={handleAddDebt} className="space-y-4 max-w-md mx-auto py-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Nama Pelanggan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pak Budi"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Jumlah Hutang (Rp)</label>
                <input
                  type="text"
                  required
                  placeholder="0"
                  value={newAmount ? Number(newAmount.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                  onChange={(e) => setNewAmount(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-black text-gray-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Tanggal Jatuh Tempo (Opsional)</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Nomor HP atau keterangan tambahan..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-medium focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-xs font-black transition-all disabled:bg-gray-200 disabled:text-gray-400"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Catatan Hutang'}
              </button>
            </form>
          ) : (
            /* TAMPILAN MATRIKS: DAFTAR RINGKASAN NAMA & JUMLAH HUTANG SAJA */
            loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
              </div>
            ) : filteredDebts.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-gray-400 text-xs text-center py-8">
                <span>Tidak ada catatan hutang.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDebts.map((debt) => {
                  const remains = debt.total_amount - (debt.paid_amount || 0)
                  const isPaid = debt.status === 'paid'

                  return (
                    <div
                      key={debt.id}
                      onClick={() => setSelectedDebtDetail(debt)} // Klik di area baris manapun memicu pergantian modal rincian
                      className={`bg-white border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all cursor-pointer hover:shadow-md hover:border-amber-300 ${
                        isPaid ? 'border-gray-100 opacity-60' : 'border-amber-100/50'
                      }`}
                    >
                      <div className="space-y-1 w-full max-w-sm">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-gray-950 group-hover:text-amber-600">{debt.borrower_name}</h4>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                            isPaid 
                              ? 'bg-gray-100 text-gray-500' 
                              : debt.status === 'partially_paid' 
                              ? 'bg-orange-50 text-orange-600' 
                              : 'bg-red-50 text-red-600'
                          }`}>
                            {isPaid ? 'Lunas' : debt.status === 'partially_paid' ? 'Dicicil' : 'Belum Bayar'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-semibold">
                          Klik kartu untuk melihat rincian belanjaan & tanggal...
                        </p>
                      </div>

                      {/* Klik Aksi Tombol Pembayaran Sisi Kanan dicegah bubling-nya agar tidak bentrok dengan klik detail kartu */}
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-gray-50"
                      >
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Sisa Hutang</span>
                          <span className={`text-sm font-black ${isPaid ? 'text-gray-400' : 'text-red-600'}`}>
                            {toRupiah(remains)}
                          </span>
                          {debt.paid_amount > 0 && !isPaid && (
                            <span className="text-[9px] text-gray-400 font-bold block">
                              Terbayar: {toRupiah(debt.paid_amount)} / {toRupiah(debt.total_amount)}
                            </span>
                          )}
                        </div>

                        {!isPaid && (
                          <div className="shrink-0">
                            {payingDebtId === debt.id ? (
                              <div className="flex gap-1.5 items-center bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                                <input
                                  type="text"
                                  placeholder="Jumlah..."
                                  value={payAmountInput ? Number(payAmountInput.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                                  onChange={(e) => setPayAmountInput(e.target.value.replace(/\D/g, ''))}
                                  className="w-20 bg-white px-2 py-1 text-[11px] font-black rounded-lg focus:outline-none text-gray-900 border border-transparent focus:border-amber-500"
                                  lock-input="true" 
                                />
                                <button
                                  type="button"
                                  onClick={() => handlePayDebt(debt)}
                                  disabled={submitting}
                                  className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider"
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPayingDebtId(null)}
                                  className="text-[10px] text-gray-400 font-bold px-1"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setPayingDebtId(debt.id)
                                  setPayAmountInput(remains.toString())
                                }}
                                className="bg-amber-50 hover:bg-amber-100 text-amber-600 px-3.5 py-2 rounded-xl transition-all active:scale-95 text-xs font-black shrink-0"
                              >
                                Cicil / Lunas
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center text-xs text-gray-500 font-bold shrink-0">
          <span>{isAddingDebt || selectedDebtDetail ? '' : `Menampilkan ${filteredDebts.length} Catatan`}</span>
          <button
            type="button"
            onClick={selectedDebtDetail ? () => setSelectedDebtDetail(null) : onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all"
          >
            {selectedDebtDetail ? 'Kembali' : 'Tutup'}
          </button>
        </div>

      </div>
    </div>
  )
}