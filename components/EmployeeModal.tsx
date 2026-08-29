'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/utils/supabase'
import { 
  Briefcase, 
  X, 
  Building, 
  ChevronRight, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Loader2,
  Search,
  AlertCircle
} from 'lucide-react'

interface EmployeeMarket {
  id: string
  market_id: string
  role: string
  status: string
  markets?: {
    id: string
    market_name: string
    market_username: string
  }
}

interface EmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
}

export default function EmployeeModal({ isOpen, onClose, user }: EmployeeModalProps) {
  const [employeeMarkets, setEmployeeMarkets] = useState<EmployeeMarket[]>([])
  const [loading, setLoading] = useState(true)
  
  // State Permintaan Gabung Toko Baru
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [targetUsername, setTargetUsername] = useState('')
  const [requestedRole, setRequestedRole] = useState('Staf')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchEmployeeData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user?.id])

  const fetchEmployeeData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          market_id,
          role,
          status,
          markets:market_id (
            id,
            market_name,
            market_username
          )
        `)
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      // Type casting safely for nested Supabase response
      setEmployeeMarkets((data as unknown as EmployeeMarket[]) || [])
    } catch (err: any) {
      console.error('Gagal mengambil data toko karyawan:', err?.message || err)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetUsername.trim()) return

    try {
      setSubmitting(true)
      setMessage(null)

      // 1. Cari toko berdasarkan username
      const cleanUsername = targetUsername.trim().toLowerCase().replace('@', '')
      const { data: marketData, error: marketErr } = await supabase
        .from('markets')
        .select('id, market_name, owner_id')
        .eq('market_username', cleanUsername)
        .single()

      if (marketErr || !marketData) {
        setMessage({ type: 'error', text: 'Toko dengan username tersebut tidak ditemukan.' })
        setSubmitting(false)
        return
      }

      // Cek apakah user adalah owner dari toko tersebut
      if (marketData.owner_id === user.id) {
        setMessage({ type: 'error', text: 'Anda adalah pemilik toko ini.' })
        setSubmitting(false)
        return
      }

      // 2. Cek apakah sudah pernah mengajukan / terdaftar
      const { data: existingEmp } = await supabase
        .from('employees')
        .select('id, status')
        .eq('market_id', marketData.id)
        .eq('profile_id', user.id)
        .single()

      if (existingEmp) {
        setMessage({ 
          type: 'error', 
          text: `Anda sudah terdaftar di toko ini (Status: ${existingEmp.status}).` 
        })
        setSubmitting(false)
        return
      }

      // 3. Masukkan permohonan ke tabel employees dengan status Pending/Menunggu
      const { error: insertErr } = await supabase
        .from('employees')
        .insert({
          market_id: marketData.id,
          profile_id: user.id,
          role: requestedRole || 'Staf',
          status: 'Menunggu',
          navigation_access: ['dashboard', 'cashier']
        })

      if (insertErr) throw insertErr

      setMessage({ 
        type: 'success', 
        text: `Permintaan bergabung dengan "${marketData.market_name}" berhasil dikirim! Menunggu persetujuan pemilik.` 
      })
      setTargetUsername('')
      setShowJoinForm(false)
      fetchEmployeeData()

    } catch (err: any) {
      console.error('Gagal mengajukan gabung toko:', err)
      setMessage({ type: 'error', text: err?.message || 'Terjadi kesalahan saat mengajukan.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">Akses Karyawan</h3>
              <p className="text-xs text-gray-400 font-medium">
                Kelola pendaftaran & toko tempat Anda bekerja
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* Pesan Notifikasi */}
          {message && (
            <div className={`p-3.5 rounded-xl text-xs font-bold flex items-start gap-2.5 ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                : 'bg-red-50 text-red-800 border border-red-100'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Form Ajukan Gabung Toko */}
          {showJoinForm ? (
            <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Gabung Toko Baru
                </h4>
                <button 
                  onClick={() => setShowJoinForm(false)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  Batal
                </button>
              </div>

              <form onSubmit={handleRequestJoin} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">
                    Username Toko
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">@</span>
                    <input
                      type="text"
                      required
                      placeholder="username_toko"
                      value={targetUsername}
                      onChange={(e) => setTargetUsername(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">
                    Posisi / Role yang Diinginkan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kasir, Staf Gudang"
                    value={requestedRole}
                    onChange={(e) => setRequestedRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {submitting ? 'Mengirim Permintaan...' : 'Kirim Permintaan Gabung'}
                </button>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setShowJoinForm(true)}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 text-gray-600 hover:text-blue-600 py-3 rounded-2xl text-xs font-bold transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Gabung ke Toko Lain</span>
            </button>
          )}

          {/* Daftar Toko Karyawan */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Daftar Toko Bekerja ({employeeMarkets.length})
            </h4>

            {loading ? (
              <div className="p-8 text-center text-xs font-bold text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span>Memuat data...</span>
              </div>
            ) : employeeMarkets.length === 0 ? (
              <div className="p-8 text-center border border-gray-100 rounded-2xl bg-gray-50/50 space-y-1">
                <Building className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs font-bold text-gray-700">Belum Terdaftar di Toko Mana Pun</p>
                <p className="text-[11px] text-gray-400">
                  Klik tombol diatas untuk mengajukan permohonan gabung ke toko.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {employeeMarkets.map((emp) => {
                  const market = emp.markets
                  const isActive = emp.status?.toLowerCase() === 'aktif' || emp.status?.toLowerCase() === 'active'

                  return (
                    <div 
                      key={emp.id}
                      className="border border-gray-100 hover:border-gray-200 rounded-2xl p-3.5 bg-white flex items-center justify-between gap-3 shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-bold shrink-0">
                          <Building className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-black text-gray-900 truncate">
                              {market?.market_name || 'Toko Tanpa Nama'}
                            </h5>
                            {market?.market_username && (
                              <span className="text-[10px] text-gray-400 font-medium">
                                @{market.market_username}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">
                              {emp.role}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                              isActive 
                                ? 'bg-emerald-50 text-emerald-600' 
                                : 'bg-amber-50 text-amber-600'
                            }`}>
                              {isActive ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                              {isActive ? 'Aktif' : 'Menunggu Persetujuan'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tombol Aksi jika Aktif */}
                      {isActive && market?.id && (
                        <Link
                          href={`/dashboard/${market.id}`}
                          onClick={onClose}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shrink-0"
                          title="Buka Dashboard Karyawan"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer Modal */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  )
}