'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

interface MyEmployment {
  id: string
  market_id: string
  status: 'Aktif' | 'Menunggu' | 'Ditolak'
  role: string
  created_at: string
  markets: {
    market_name: string
    market_type: string
  } | null
}

export default function EmployeeRequestsPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [marketUsername, setMarketUsername] = useState('')
  const [myEmployments, setMyEmployments] = useState<MyEmployment[]>([])
  const router = useRouter()

  useEffect(() => {
    fetchMyEmployments()
  }, [])

  const fetchMyEmployments = async () => {
    try {
      setLoading(true)
      setMessage({ text: '', type: '' })

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      const { data: employmentData, error: dbError } = await supabase
        .from('employees')
        .select(`
          id,
          market_id,
          status,
          role,
          created_at,
          markets (
            market_name,
            market_type
          )
        `)
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })

      if (dbError) throw dbError
      setMyEmployments((employmentData as any) || [])
    } catch (error: any) {
      setMessage({ text: error.message || 'Gagal memuat data pekerjaan.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleApplyJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!marketUsername.trim()) return

    try {
      setSubmitting(true)
      setMessage({ text: '', type: '' })

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) return

      // 1. Cari toko berdasarkan username
      const { data: market, error: marketError } = await supabase
        .from('markets')
        .select('id')
        .eq('market_username', marketUsername.trim().toLowerCase())
        .single()

      if (marketError || !market) {
        throw new Error('Toko tidak ditemukan. Silakan periksa kembali username toko Anda.')
      }

      // 2. Cek apakah user sudah memiliki permohonan 'Menunggu' atau 'Aktif' di toko ini
      const { data: existing } = await supabase
        .from('employees')
        .select('id, status')
        .eq('profile_id', user.id)
        .eq('market_id', market.id)
        .in('status', ['Menunggu', 'Aktif'])
        .maybeSingle()

      if (existing) {
        const errorMsg = existing.status === 'Aktif'
          ? 'Anda sudah terdaftar sebagai karyawan di toko ini.'
          : 'Permintaan Anda sebelumnya ke toko ini masih menunggu persetujuan.'
        throw new Error(errorMsg)
      }

      // 3. Kirim permohonan baru (memanfaatkan default values dari skema Supabase)
      const { error: insertError } = await supabase
        .from('employees')
        .insert([
          {
            profile_id: user.id,
            market_id: market.id
          }
        ])

      if (insertError) throw insertError

      setMessage({ text: 'Permintaan bergabung berhasil dikirim! Menunggu persetujuan pemilik toko.', type: 'success' })
      setMarketUsername('')
      fetchMyEmployments()
    } catch (error: any) {
      setMessage({ text: error.message || 'Gagal mengajukan permohonan.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEnterDashboard = (marketId: string) => {
    router.push(`/dashboard/${marketId}`)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-sm font-semibold text-gray-500 py-12">
        <svg className="animate-spin h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Memuat data status kerja...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
        <div>
          <h1 className="text-xl font-black text-gray-950 tracking-tight">Gabung sebagai Karyawan</h1>
          <p className="text-xs text-gray-500 mt-1">Masukkan username unik toko (Market Username) yang diberikan oleh pemilik toko untuk mengajukan diri sebagai staf operasional.</p>
        </div>

        <form onSubmit={handleApplyJob} className="mt-5 flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="text"
            required
            value={marketUsername}
            onChange={(e) => setMarketUsername(e.target.value)}
            placeholder="Contoh: necostore.sub"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-red-500 transition-colors bg-gray-50/50 lowercase placeholder:normal-case"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-xl text-sm font-bold shadow-md shadow-red-100 transition-all active:scale-95 shrink-0"
          >
            {submitting ? 'Mengirim...' : 'Kirim Permintaan'}
          </button>
        </form>

        {message.text && (
          <div className={`mt-5 p-4 rounded-xl text-sm font-semibold border transition-all ${
            message.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
        <div className="mb-4">
          <h2 className="text-base font-black text-gray-950 tracking-tight">Status Pekerjaan & Toko Saya</h2>
          <p className="text-xs text-gray-400 mt-0.5">Daftar tempat usaha Anda bekerja atau status peninjauan hak akses berkala.</p>
        </div>

        {myEmployments.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl px-4">
            <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0V11m0 0h5m-5 0H7m3 4h2M9 7h2m3 4h2m-2 4h2M9 15h2" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900">Belum terikat dengan toko manapun</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">Minta username akses ke pemilik outlet (Owner) untuk memunculkan panel stasiun kerja Anda di sini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 md:-mx-8">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                  <th className="py-3 px-6 md:px-8">Nama Toko / Outlet</th>
                  <th className="py-3 px-4">Tipe Bisnis</th>
                  <th className="py-3 px-4">Jabatan Staf</th>
                  <th className="py-3 px-4 text-center">Status Akses</th>
                  <th className="py-3 px-6 md:px-8 text-right">Aksi Konsol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {myEmployments.map((item) => {
                  const isAktif = item.status === 'Aktif'
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="py-4 px-6 md:px-8">
                        <p className="text-sm font-bold text-gray-900">{item.markets?.market_name || 'Outlet Tidak Diketahui'}</p>
                        <p className="text-[11px] text-gray-400 tracking-tight">Diajukan pada {new Date(item.created_at).toLocaleDateString('id-ID')}</p>
                      </td>
                      <td className="py-4 px-4 align-middle text-sm text-gray-600 font-medium capitalize">
                        {item.markets?.market_type || 'N/A'}
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <span className="text-xs font-black px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md uppercase border border-gray-200/60">
                          {item.role || 'Staf'}
                        </span>
                      </td>
                      <td className="py-4 px-4 align-middle text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                          isAktif 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : item.status === 'Ditolak'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {isAktif ? 'Aktif / Diterima' : item.status === 'Ditolak' ? 'Akses Ditolak' : 'Menunggu Approval'}
                        </span>
                      </td>
                      <td className="py-4 px-6 md:px-8 text-right align-middle">
                        {isAktif ? (
                          <button
                            onClick={() => handleEnterDashboard(item.market_id)}
                            className="px-4 py-1.5 bg-gray-950 hover:bg-red-600 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm inline-flex items-center gap-1.5"
                          >
                            <span>Buka Dashboard</span>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic font-medium">
                            {item.status === 'Ditolak' ? 'Dapat Mengajukan Ulang' : 'Menunggu Verifikasi Owner'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}