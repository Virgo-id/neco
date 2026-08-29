'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/utils/supabase'
import { 
  Users, 
  UserCheck, 
  Shield, 
  Trash2, 
  Check, 
  X, 
  Loader2, 
  Lock,
  Eye,
  AlertTriangle,
  Pencil
} from 'lucide-react'

interface Profile {
  full_name?: string
  email?: string
}

interface Employee {
  id: string
  market_id: string
  profile_id: string
  role: string
  navigation_access: string[]
  status: string
  created_at: string
  updated_at?: string
  profiles?: Profile | null
}

interface NavOption {
  id: string
  name: string
}

const BASE_NAVIGATION_OPTIONS: NavOption[] = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'cashier', name: 'Kasir / Transaksi' },
  { id: 'products', name: 'Manajemen Produk' },
  { id: 'services', name: 'Manajemen Layanan' },
  { id: 'employees', name: 'Manajemen Karyawan' },
]

export default function EmployeesPage({
  params,
}: {
  params: Promise<{ marketid: string }>
}) {
  const { marketid } = use(params)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [marketUsername, setMarketUsername] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [updatingNavId, setUpdatingNavId] = useState<string | null>(null)

  const [navigationOptions, setNavigationOptions] = useState<NavOption[]>(BASE_NAVIGATION_OPTIONS)

  // Modals State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [selectedDetailEmployee, setSelectedDetailEmployee] = useState<Employee | null>(null)

  // Modal Edit Role State
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false)
  const [newRoleInput, setNewRoleInput] = useState('')
  const [savingRole, setSavingRole] = useState(false)
  
  // Custom Confirmation Dialog State
  const [savingAction, setSavingAction] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    action: () => Promise<void>
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  })

  // Toast / Status Message State
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketid])

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type })
    setTimeout(() => setFeedback(null), 3000)
  }

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
      
      const { data: marketData, error: marketError } = await supabase
        .from('markets')
        .select(`
          market_username, 
          is_pickup_enabled,
          is_delivery_enabled,
          is_order_from_table_enabled,
          is_drivethru_enabled,
          is_dinein_staff_enabled
        `)
        .eq('id', marketid)
        .single()

      if (marketError && marketError.code !== 'PGRST116') {
        console.error('Error fetching market info:', marketError)
      }
      
      if (marketData) {
        setMarketUsername(marketData.market_username || '')

        const dynamicOptions = [...BASE_NAVIGATION_OPTIONS]

        if (marketData.is_pickup_enabled) {
          dynamicOptions.push({ id: 'pickup_orders', name: 'Layanan: Ambil Di Tempat' })
        }
        if (marketData.is_drivethru_enabled) {
          dynamicOptions.push({ id: 'drivethru_orders', name: 'Layanan: Drive Thru' })
        }
        if (marketData.is_delivery_enabled) {
          dynamicOptions.push({ id: 'delivery_orders', name: 'Layanan: Antar Rumah' })
        }
        if (marketData.is_order_from_table_enabled) {
          dynamicOptions.push({ id: 'table_orders', name: 'Layanan: QR Meja' })
        }
        if (marketData.is_dinein_staff_enabled) {
          dynamicOptions.push({ id: 'dinein_staff_orders', name: 'Layanan: Dine-In Staff' })
        }

        setNavigationOptions(dynamicOptions)
      }

      await fetchEmployees()

    } catch (err: any) {
      console.error('Gagal memuat data awal:', err?.message || err)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id, market_id, profile_id, role, navigation_access, status, created_at, updated_at,
          profiles:profile_id ( full_name, email )
        `)
        .eq('market_id', marketid)
        .order('created_at', { ascending: false })

      if (error) throw error

      const normalizedEmployees: Employee[] = (data || []).map((employee: any) => ({
        ...employee,
        profiles: Array.isArray(employee.profiles)
          ? employee.profiles[0] ?? null
          : employee.profiles ?? null,
      }))

      setEmployees(normalizedEmployees)
    } catch (err: any) {
      console.error('Gagal memuat data karyawan:', err?.message || err)
    }
  }

  const handleApproveEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ status: 'Aktif', updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      showFeedback('Permintaan bergabung berhasil disetujui!')
      fetchEmployees()
    } catch (err) {
      console.error('Gagal menyetujui karyawan:', err)
      showFeedback('Gagal memproses akses persetujuan.', 'error')
    }
  }

  const handleToggleNavAccess = async (navId: string) => {
    if (!selectedDetailEmployee) return
    if (selectedDetailEmployee.profile_id === currentUserId) return

    const currentAccess = Array.isArray(selectedDetailEmployee.navigation_access) 
      ? selectedDetailEmployee.navigation_access 
      : []

    const updatedAccess = currentAccess.includes(navId)
      ? currentAccess.filter(id => id !== navId)
      : [...currentAccess, navId]

    try {
      setUpdatingNavId(navId)
      const { error } = await supabase
        .from('employees')
        .update({
          navigation_access: updatedAccess,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDetailEmployee.id)

      if (error) throw error

      setSelectedDetailEmployee({
        ...selectedDetailEmployee,
        navigation_access: updatedAccess
      })

      setEmployees(prev => prev.map(emp => 
        emp.id === selectedDetailEmployee.id 
          ? { ...emp, navigation_access: updatedAccess } 
          : emp
      ))

      showFeedback('Hak akses berhasil diperbarui!')
    } catch (err) {
      console.error('Gagal memperbarui akses navigasi:', err)
      showFeedback('Gagal mengubah hak akses.', 'error')
    } finally {
      setUpdatingNavId(null)
    }
  }

  const handleOpenEditRole = () => {
    if (!selectedDetailEmployee) return
    setNewRoleInput(selectedDetailEmployee.role || 'Staf')
    setIsEditRoleOpen(true)
  }

  const handleUpdateRole = async () => {
    if (!selectedDetailEmployee || !newRoleInput.trim()) return

    try {
      setSavingRole(true)
      const updatedRole = newRoleInput.trim()

      const { error } = await supabase
        .from('employees')
        .update({
          role: updatedRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDetailEmployee.id)

      if (error) throw error

      setSelectedDetailEmployee({
        ...selectedDetailEmployee,
        role: updatedRole
      })

      setEmployees(prev => prev.map(emp => 
        emp.id === selectedDetailEmployee.id 
          ? { ...emp, role: updatedRole } 
          : emp
      ))

      showFeedback('Role berhasil diperbarui!')
      setIsEditRoleOpen(false)
    } catch (err) {
      console.error('Gagal memperbarui role:', err)
      showFeedback('Gagal mengubah role karyawan.', 'error')
    } finally {
      setSavingRole(false)
    }
  }

  const promptDeleteEmployee = (id: string, isRequest: boolean = false) => {
    const targetEmp = employees.find(e => e.id === id)
    if (targetEmp && targetEmp.profile_id === currentUserId) {
      showFeedback('Anda tidak bisa menghapus akses akun Anda sendiri.', 'error')
      return
    }

    setConfirmDialog({
      isOpen: true,
      title: isRequest ? 'Tolak Permintaan' : 'Hapus Karyawan',
      message: isRequest
        ? 'Apakah Anda yakin ingin menolak permohonan masuk ini?'
        : 'Akses karyawan ini akan dicabut secara permanen. Lanjutkan?',
      action: async () => {
        try {
          setSavingAction(true)
          const { error } = await supabase.from('employees').delete().eq('id', id)
          if (error) throw error

          showFeedback(isRequest ? 'Permintaan berhasil ditolak!' : 'Karyawan berhasil dihapus!')
          if (selectedDetailEmployee?.id === id) {
            setSelectedDetailEmployee(null)
          }
          fetchEmployees()
        } catch (err) {
          console.error('Gagal menghapus/menolak karyawan:', err)
          showFeedback('Gagal memproses aksi.', 'error')
        } finally {
          setSavingAction(false)
        }
      }
    })
  }

  const activeEmployees = employees.filter((emp) => 
    emp.status?.toLowerCase() === 'aktif' || emp.status?.toLowerCase() === 'active'
  )
  const pendingRequests = employees.filter((emp) => 
    emp.status?.toLowerCase() === 'menunggu' || emp.status?.toLowerCase() === 'pending'
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 text-gray-900">
      
      {/* NOTIFIKASI TOAST CUSTOM */}
      {feedback && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-2 ${
          feedback.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {feedback.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* HEADER RINGKAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 text-red-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900">Staf Toko</h1>
              {marketUsername && (
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                  @{marketUsername}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">Kelola daftar tim dan atur otorisasi akses menu.</p>
          </div>
        </div>

        {/* TOMBOL PERMINTAAN MASUK */}
        <button
          onClick={() => setIsRequestModalOpen(true)}
          className="relative inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-medium transition-all shrink-0"
        >
          <UserCheck className="w-4 h-4 text-red-400" />
          <span>Permintaan Masuk</span>
          {pendingRequests.length > 0 && (
            <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* TAMPILAN UTAMA */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2 text-xs font-medium text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin text-red-500" />
            <span>Memuat data karyawan...</span>
          </div>
        ) : activeEmployees.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto space-y-2">
            <Users className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-xs font-bold text-gray-700">Belum Ada Karyawan Aktif</p>
            <p className="text-[11px] text-gray-400">Permintaan bergabung yang disetujui akan muncul di sini.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeEmployees.map((emp) => {
              const isSelf = emp.profile_id === currentUserId
              const navCount = Array.isArray(emp.navigation_access) ? emp.navigation_access.length : 0
              const displayName = emp.profiles?.full_name || emp.profiles?.email || `Karyawan (${emp.profile_id.substring(0, 6)}...)`

              return (
                <div 
                  key={emp.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {displayName.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {displayName}
                        </span>
                        {isSelf && (
                          <span className="bg-red-100 text-red-700 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-0.5">
                            <Lock className="w-2 h-2" /> Anda
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <span className="font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{emp.role}</span>
                        <span>•</span>
                        <span>{navCount} Fitur Diakses</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedDetailEmployee(emp)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-white transition-all shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5 text-gray-400" />
                    <span>Detail</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ----------------- MODAL DETAIL KARYAWAN ----------------- */}
      {selectedDetailEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150 border border-gray-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-600" />
                <h3 className="text-xs font-bold text-gray-900">Detail Karyawan</h3>
              </div>
              <button
                onClick={() => setSelectedDetailEmployee(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Nama & Email */}
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-2">
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Nama Karyawan</div>
                  <div className="text-xs font-bold text-gray-900 mt-0.5">
                    {selectedDetailEmployee.profiles?.full_name || 'Tidak ada nama'}
                  </div>
                </div>
                {selectedDetailEmployee.profiles?.email && (
                  <div>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Email</div>
                    <div className="text-xs text-gray-600 mt-0.5">{selectedDetailEmployee.profiles.email}</div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Role</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                      {selectedDetailEmployee.role}
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenEditRole}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200 hover:border-red-200"
                      title="Edit Role"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* TOGGLE SWITCH HAK AKSES */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Pengaturan Hak Akses Navigasi
                </label>
                
                {selectedDetailEmployee.profile_id === currentUserId && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded-lg font-medium">
                    Akses akun sendiri tidak dapat diubah dari sini.
                  </p>
                )}

                <div className="space-y-1.5 border border-gray-100 p-2 rounded-xl bg-gray-50/50">
                  {navigationOptions.map((option) => {
                    const isAllowed = Array.isArray(selectedDetailEmployee.navigation_access) && 
                      selectedDetailEmployee.navigation_access.includes(option.id)
                    const isSelf = selectedDetailEmployee.profile_id === currentUserId

                    return (
                      <div 
                        key={option.id}
                        className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-xl"
                      >
                        <span className="text-xs font-medium text-gray-800">{option.name}</span>
                        
                        {/* Custom Toggle Switch */}
                        <button
                          type="button"
                          disabled={isSelf || updatingNavId === option.id}
                          onClick={() => handleToggleNavAccess(option.id)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                            isAllowed ? 'bg-red-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isAllowed ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ACTION BUTTON HAPUS KARYAWAN */}
              {selectedDetailEmployee.profile_id !== currentUserId && (
                <div className="pt-3 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => promptDeleteEmployee(selectedDetailEmployee.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Karyawan</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ----------------- MODAL EDIT ROLE ----------------- */}
      {isEditRoleOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl space-y-4 border border-gray-100 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-900">Ubah Role</h3>
              <button
                type="button"
                onClick={() => setIsEditRoleOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">
                Nama Role Baru
              </label>
              <input
                type="text"
                value={newRoleInput}
                onChange={(e) => setNewRoleInput(e.target.value)}
                placeholder="Contoh: Kasir, Admin, Staf"
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-red-500 text-gray-900"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditRoleOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingRole || !newRoleInput.trim()}
                onClick={handleUpdateRole}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl"
              >
                {savingRole && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL PERMINTAAN MASUK ----------------- */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-xl overflow-hidden border border-gray-100">
            
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-red-600" />
                <h3 className="text-xs font-bold text-gray-900">Permintaan Masuk</h3>
              </div>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {pendingRequests.length === 0 ? (
                <div className="p-8 text-center space-y-1">
                  <p className="text-xs font-bold text-gray-700">Tidak Ada Permintaan</p>
                  <p className="text-[11px] text-gray-400">Seluruh permintaan pendaftaran telah diproses.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingRequests.map((emp) => {
                    const reqName = emp.profiles?.full_name || emp.profiles?.email || emp.profile_id

                    return (
                      <div key={emp.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-gray-50/50">
                        <div>
                          <div className="text-xs font-bold text-gray-800">
                            {reqName}
                          </div>
                          <div className="text-[10px] text-red-600 font-semibold mt-0.5">{emp.role}</div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleApproveEmployee(emp.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-all"
                          >
                            <Check className="w-3 h-3" />
                            <span>Terima</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => promptDeleteEmployee(emp.id, true)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-all"
                          >
                            <X className="w-3 h-3" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ----------------- MODAL KONFIRMASI CUSTOM ----------------- */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-gray-100 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-gray-900">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={savingAction}
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl disabled:opacity-50"
              >
                Batal
              </button>
              <button
                disabled={savingAction}
                onClick={async () => {
                  const actionToRun = confirmDialog.action
                  setConfirmDialog({ ...confirmDialog, isOpen: false })
                  await actionToRun()
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl"
              >
                {savingAction && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Ya, Lanjutkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}