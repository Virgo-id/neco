'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { 
  Home,
  LayoutDashboard,
  Coins,
  Package,
  Users,
  Briefcase,
  Settings,
  ChevronRight,
  ChevronUp,
  X,
  Menu,
  ShoppingBag,
  Truck,
  Zap,
  QrCode,
  UserCheck
} from 'lucide-react'

interface MarketDetail {
  id: string
  market_name: string
  market_username: string
  market_logo_url: string | null
}

interface UserProfile {
  email: string
  avatar_url?: string | null
  roleName: string | null
  navigationAccess: string[]
  isOwner: boolean
}

interface ActiveServices {
  is_pickup_enabled: boolean
  is_delivery_enabled: boolean
  is_order_from_table_enabled: boolean
  is_drivethru_enabled: boolean
  is_dinein_staff_enabled: boolean
}

export default function MarketDashboardLayoutClient({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ marketid: string }>
}) {
  const { marketid } = use(params)
  const router = useRouter()
  const pathname = usePathname()
  
  // State Manajemen Navigasi & Tampilan Sidebar
  const [showSidebar, setShowSidebar] = useState(false)
  const [showLogoutMenu, setShowLogoutMenu] = useState(false)
  
  // State Sesi Data Toko & Autentikasi
  const [loading, setLoading] = useState(true)
  const [market, setMarket] = useState<MarketDetail | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [activeServices, setActiveServices] = useState<ActiveServices>({
    is_pickup_enabled: false,
    is_delivery_enabled: false,
    is_order_from_table_enabled: false,
    is_drivethru_enabled: false,
    is_dinein_staff_enabled: false
  })

  useEffect(() => {
    setShowSidebar(false)
  }, [pathname])

  useEffect(() => {
    fetchMarketDetail()

    const channel = supabase
      .channel(`realtime-market-services-${marketid}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'markets',
          filter: `id=eq.${marketid}`,
        },
        (payload) => {
          const newData = payload.new;
          setActiveServices({
            is_pickup_enabled: newData.is_pickup_enabled ?? false,
            is_delivery_enabled: newData.is_delivery_enabled ?? false,
            is_order_from_table_enabled: newData.is_order_from_table_enabled ?? false,
            is_drivethru_enabled: newData.is_drivethru_enabled ?? false,
            is_dinein_staff_enabled: newData.is_dinein_staff_enabled ?? false,
          })
          
          if (newData.market_logo_url !== undefined) {
            setMarket((prev) => prev ? { ...prev, market_logo_url: newData.market_logo_url } : null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [marketid])

  const fetchMarketDetail = async () => {
    try {
      setLoading(true)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      const { data: marketData, error: marketError } = await supabase
        .from('markets')
        .select(`
          id, market_name, market_username, market_logo_url, owner_id,
          is_pickup_enabled, is_delivery_enabled, is_order_from_table_enabled, 
          is_drivethru_enabled, is_dinein_staff_enabled
        `) 
        .eq('id', marketid)
        .single()

      if (marketError || !marketData) {
        console.error(marketError)
        router.push('/profile/my-market')
        return
      }

      setActiveServices({
        is_pickup_enabled: marketData.is_pickup_enabled || false,
        is_delivery_enabled: marketData.is_delivery_enabled || false,
        is_order_from_table_enabled: marketData.is_order_from_table_enabled || false,
        is_drivethru_enabled: marketData.is_drivethru_enabled || false,
        is_dinein_staff_enabled: marketData.is_dinein_staff_enabled || false
      })

      let roleName: string | null = null
      let navigationAccess: string[] = []
      let isOwner = false

      const currentUserId = user.id.toString().toLowerCase()
      const marketOwnerId = marketData.owner_id?.toString().toLowerCase()

      if (currentUserId === marketOwnerId) {
        isOwner = true
        roleName = 'Owner'
      } else {
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('role, status, navigation_access')
          .eq('market_id', marketid)
          .eq('profile_id', user.id)
          .single()

        if (employeeError || employeeData?.status?.toLowerCase() !== 'aktif') {
          router.push('/profile/my-market')
          return
        }

        roleName = employeeData.role || 'Staf'
        navigationAccess = Array.isArray(employeeData.navigation_access) 
          ? employeeData.navigation_access 
          : []
      }

      setUserProfile({
        email: user.email || '',
        avatar_url: user.user_metadata?.avatar_url,
        roleName,
        navigationAccess,
        isOwner
      })

      setMarket(marketData)
    } catch (err) {
      console.error('Terjadi kesalahan memuat data layout:', err)
      router.push('/profile/my-market')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToHome = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowSidebar(false)
    setShowLogoutMenu(false)
    router.push('/')
  }

  const masterNavItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      href: `/dashboard/${marketid}`,
      icon: <LayoutDashboard className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />,
      exact: true
    },
    {
      id: 'cashier',
      name: 'Kasir',
      href: `/dashboard/${marketid}/cashier`,
      icon: <Coins className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />,
      exact: false
    },
    {
      id: 'products',
      name: 'Produk',
      href: `/dashboard/${marketid}/products`,
      icon: <Package className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />,
      exact: false
    },
    {
      id: 'employees',
      name: 'Karyawan',
      href: `/dashboard/${marketid}/employees`,
      icon: <Users className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />,
      exact: false
    },
    {
      id: 'services',
      name: 'Layanan',
      href: `/dashboard/${marketid}/services`,
      icon: <Briefcase className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />,
      exact: false
    },
    {
      id: 'settings',
      name: 'Pengaturan',
      href: `/dashboard/${marketid}/settings`,
      icon: <Settings className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />,
      exact: false
    }
  ]

  const serviceNavItems = [
    {
      id: 'service-pickup',
      name: 'Order Pickup',
      href: `/dashboard/${marketid}/order-pickup`,
      isVisible: activeServices.is_pickup_enabled,
      icon: <ShoppingBag className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />
    },
    {
      id: 'service-drivethru',
      name: 'Order Drive Thru',
      href: `/dashboard/${marketid}/order-drivethru`,
      isVisible: activeServices.is_drivethru_enabled,
      icon: <Zap className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />
    },
    {
      id: 'service-delivery',
      name: 'Order Delivery',
      href: `/dashboard/${marketid}/order-delivery`,
      isVisible: activeServices.is_delivery_enabled,
      icon: <Truck className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />
    },
    {
      id: 'service-table-qr',
      name: 'Dine-In QR Meja',
      href: `/dashboard/${marketid}/order-table-qr`,
      isVisible: activeServices.is_order_from_table_enabled,
      icon: <QrCode className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />
    },
    {
      id: 'service-staff',
      name: 'Dine-In Staff',
      href: `/dashboard/${marketid}/order-staff`,
      isVisible: activeServices.is_dinein_staff_enabled,
      icon: <UserCheck className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />
    }
  ]

  const filteredNavItems = masterNavItems.filter(item => {
    if (loading) return false
    if (userProfile?.isOwner) return true
    return userProfile?.navigationAccess?.includes(item.id) || false
  })

  const visibleServices = serviceNavItems.filter(item => {
    if (loading || !item.isVisible) return false
    if (userProfile?.isOwner) return true
    return userProfile?.navigationAccess?.includes('services') || false
  })

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full relative bg-[#ffffff]">
      
      {/* Backdrop penutup sidebar di mobile */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 transition-opacity md:hidden"
          onClick={() => {
            setShowSidebar(false)
            setShowLogoutMenu(false)
          }}
        />
      )}
      
      {/* KOLOM 1 (KIRI): SIDEBAR PANEL UTAMA */}
      <aside className={`fixed md:sticky top-0 left-0 h-full md:h-screen w-64 bg-[#ffffff] z-50 md:z-30 transform transition-transform duration-200 ease-in-out p-4 flex flex-col justify-between border-gray-100 md:border-r flex-shrink-0 ${
        showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        
        {/* PROFILE TOKO */}
        <div className="relative flex flex-col items-center text-center pt-2 pb-3 flex-shrink-0 w-full">
          {loading ? (
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="w-14 h-14 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
            </div>
          ) : (
            <Link href="/" className="flex flex-col items-center gap-2 group w-full" onClick={() => setShowSidebar(false)}>
              <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center bg-gray-50 flex-shrink-0 border border-gray-100 shadow-sm">
                {market?.market_logo_url ? (
                  <img src={market.market_logo_url} alt={market.market_name} className="w-full h-full object-cover" />
                ) : (
                  <img src="/favicon.ico" alt="Neco Logo" className="w-full h-full object-cover" />
                )}
              </div>
              <span className="text-sm font-black tracking-tight text-gray-950 truncate max-w-[200px]">
                {market?.market_name || 'Dashboard'}
              </span>
            </Link>
          )}
          
          <button 
            onClick={() => {
              setShowSidebar(false)
              setShowLogoutMenu(false)
            }} 
            className="absolute top-0 right-0 p-1 text-gray-400 hover:text-gray-600 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <hr className="border-gray-100 flex-shrink-0" />

        {/* NAVIGASI SIDEBAR */}
        <div className="flex-1 overflow-y-auto my-3 pr-1 no-scrollbar text-xs space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 px-3 font-bold pb-1">Navigasi Toko</p>
          
          {filteredNavItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith(item.href)

            return (
              <Link 
                key={item.id}
                href={item.href} 
                className={`flex items-center justify-between px-3 py-2.5 font-semibold rounded-lg transition-colors group ${
                  isActive 
                    ? 'bg-red-600 text-white' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
                onClick={() => setShowSidebar(false)}
              >
                <div className="flex items-center gap-2.5">
                  {React.cloneElement(item.icon, { className: `w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-red-600 transition-colors'}` })}
                  <span>{item.name}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white/80' : 'text-gray-400'}`} />
              </Link>
            )
          })}

          {/* MONITOR LAYANAN */}
          {!loading && visibleServices.length > 0 && (
            <div className="pt-4 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 px-3 font-bold pb-1">Monitor Layanan</p>
              <div className="space-y-1">
                {visibleServices.map((subItem) => {
                  const isSubActive = pathname.startsWith(subItem.href)
                  return (
                    <Link
                      key={subItem.id}
                      href={subItem.href}
                      className={`flex items-center justify-between px-3 py-2.5 font-semibold rounded-lg transition-colors group ${
                        isSubActive 
                          ? 'bg-red-600 text-white' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                      onClick={() => setShowSidebar(false)}
                    >
                      <div className="flex items-center gap-2.5">
                        {React.cloneElement(subItem.icon, { className: `w-4 h-4 ${isSubActive ? 'text-white' : 'text-gray-400 group-hover:text-red-600 transition-colors'}` })}
                        <span>{subItem.name}</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 ${isSubActive ? 'text-white/80' : 'text-gray-400'}`} />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER SIDEBAR */}
        <div className="pt-3 border-t border-gray-100 flex-shrink-0">
          <div>
            {loading ? (
              <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
            ) : userProfile ? (
              <div
                onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                className={`w-full flex flex-col overflow-hidden rounded-lg border transition-all duration-300 cursor-pointer ${
                  showLogoutMenu 
                    ? 'bg-gray-50 border-gray-200 p-2 space-y-2' 
                    : 'bg-white hover:bg-gray-50 border-gray-100 p-1.5'
                }`}
              >
                <div className="flex items-center justify-between text-left">
                  <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                    {userProfile.avatar_url ? (
                      <img 
                        src={userProfile.avatar_url} 
                        alt="Avatar" 
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0" 
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                        {userProfile.email.charAt(0)}
                      </div>
                    )}
                    <div className="truncate flex flex-col">
                      <span className="text-xs font-black text-gray-900 truncate flex items-center gap-1.5">
                        {userProfile.email.split('@')[0]}
                        {userProfile.roleName && (
                          <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded font-black uppercase tracking-wide">
                            {userProfile.roleName}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-gray-400 truncate">{userProfile.email}</span>
                    </div>
                  </div>
                  
                  <ChevronUp className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-1 transition-transform duration-300 ${
                    showLogoutMenu ? 'rotate-180 text-gray-600' : ''
                  }`} />
                </div>

                {showLogoutMenu && (
                  <button 
                    onClick={handleBackToHome} 
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-gray-100 text-gray-700 font-bold rounded-md transition-colors text-xs border border-gray-200 bg-white shadow-sm animate-in fade-in slide-in-from-top-1 duration-200"
                  >
                    <Home className="w-4 h-4 text-gray-500" />
                    <span>Halaman Utama</span>
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      {/* KOLOM 2 (KANAN): KONTEN UTAMA */}
      <div className="flex-1 flex flex-col min-w-0 w-full relative">
        
        {/* BAR MOBILE */}
        <div className="md:hidden px-4 py-3 flex items-center bg-[#ffffff] sticky top-0 z-40 justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSidebar(true)}
              className="p-1 text-gray-600 hover:text-red-600 focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="text-sm font-black text-gray-950 truncate max-w-[180px]">
              {market?.market_name}
            </span>
          </div>

          <div>
            {loading ? (
              <div className="w-7 h-7 bg-gray-100 rounded-full animate-pulse" />
            ) : userProfile ? (
              <Link href="/" className="block focus:outline-none">
                {userProfile.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url} 
                    alt="Profile" 
                    className="w-7 h-7 rounded-full object-cover border border-gray-200 shadow-sm"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-black text-xs uppercase border border-red-200">
                    {userProfile.email.charAt(0)}
                  </div>
                )}
              </Link>
            ) : null}
          </div>
        </div>

        {/* AREA KONTEN */}
        <main className="flex-1 w-full p-4 md:p-8 relative">
          {loading ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-sm font-semibold text-gray-500 bg-[#ffffff]">
              <svg className="animate-spin h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Memuat data akses toko...</span>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

    </div>
  )
}