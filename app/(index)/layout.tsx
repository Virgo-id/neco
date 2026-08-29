'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { 
  User as UserIcon, 
  LogOut,
  Store,
  Briefcase,
  History,
  Plus,
  Package,
  Search,
  Menu,
  X,
  ChevronDown,
  Loader2 
} from 'lucide-react'

import ProfileModal from '@/components/ProfileModal' 
import EmployeeModal from '@/components/EmployeeModal'
import StoreModal from '@/components/StoreModal'
import OrdersModal from '@/components/OrdersModal'

export default function IndexLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false)
  const [isStoreOpen, setIsStoreOpen] = useState(false)
  const [isOrdersOpen, setIsOrdersOpen] = useState(false)
  
  const [user, setUser] = useState<any>(null)
  const [userMarkets, setUserMarkets] = useState<any[]>([])
  const [employeeMarkets, setEmployeeMarkets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'toko' | 'produk'>('toko')
  const [showSearchTypeDropdown, setShowSearchTypeDropdown] = useState(false)
  
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // State baru untuk melacak indeks sugesti yang sedang dipilih menggunakan keyboard
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  
  const profileRef = useRef<HTMLDivElement>(null)
  const searchTypeRef = useRef<HTMLDivElement>(null) 
  const searchContainerRef = useRef<HTMLFormElement>(null)

  const getLogoUrl = (path: string | null) => {
    if (!path) return null
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    const { data } = supabase.storage.from('market-logos').getPublicUrl(path)
    return data?.publicUrl || null
  }

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUser(user)
          await fetchMarketsData(user.id)
        }
      } catch (error) {
        console.error('Gagal mengambil sesi:', error)
      } finally {
        startTransitionComplete()
      }
    }

    const startTransitionComplete = () => {
      setLoading(false)
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        await fetchMarketsData(session.user.id)
      } else {
        setUser(null)
        setUserMarkets([])
        setEmployeeMarkets([])
      }
      setLoading(false)
    })

    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false)
      }
      if (searchTypeRef.current && !searchTypeRef.current.contains(event.target as Node)) {
        setShowSearchTypeDropdown(false)
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const trimmedQuery = searchQuery.trim()
    
    if (!trimmedQuery) {
      setSuggestions([])
      setIsSearching(false)
      setFocusedIndex(-1) // Reset index saat query kosong
      return
    }

    setIsSearching(true)

    const delayDebounceFn = setTimeout(async () => {
      try {
        if (searchType === 'toko') {
          const { data, error } = await supabase
            .from('markets')
            .select('id, market_name')
            .ilike('market_name', `%${trimmedQuery}%`)
            .limit(6)

          if (!error && data) {
            setSuggestions(data.map(item => ({ id: item.id, display: item.market_name })))
          }
        } else {
          const { data, error } = await supabase
            .from('products')
            .select('id, product_name')
            .ilike('product_name', `%${trimmedQuery}%`)
            .limit(6)

          if (!error && data) {
            setSuggestions(data.map(item => ({ id: item.id, display: item.product_name })))
          }
        }
        setFocusedIndex(-1) // Reset index setiap kali data penjelajahan baru masuk
      } catch (err) {
        console.error('Gagal memuat saran pencarian:', err)
      } finally {
        setIsSearching(false)
      }
    }, 400)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, searchType])

  const fetchMarketsData = async (userId: string) => {
    try {
      const { data: owned } = await supabase
        .from('markets')
        .select('id, market_name, market_logo_url')
        .eq('owner_id', userId)
        
      if (owned) setUserMarkets(owned)

      const { data: works } = await supabase
        .from('employees')
        .select(`
          market_id, 
          status, 
          markets (
            id, 
            market_name, 
            market_logo_url
          )
        `)
        .eq('profile_id', userId)
        
      if (works) setEmployeeMarkets(works)
    } catch (error) {
      console.error('Gagal memuat data toko:', error)
    }
  }

  const handleLogout = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await supabase.auth.signOut()
    setUser(null)
    setShowProfileDropdown(false)
    router.push('/')
    router.refresh()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Jika user menekan enter dan ada item sugesti yang sedang difokuskan lewat keyboard
    if (showSuggestions && focusedIndex >= 0 && focusedIndex < suggestions.length) {
      handleSuggestionClick(suggestions[focusedIndex].display)
    } else if (searchQuery.trim()) {
      setShowSuggestions(false)
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}&type=${searchType}`)
    }
  }

  const handleSuggestionClick = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(false)
    setFocusedIndex(-1)
    router.push(`/search?q=${encodeURIComponent(value)}&type=${searchType}`)
  }

  // Fungsi baru untuk menangani navigasi tombol panah naik/turun pada input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prevIndex) => 
        prevIndex < suggestions.length - 1 ? prevIndex + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prevIndex) => 
        prevIndex > 0 ? prevIndex - 1 : suggestions.length - 1
      )
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setFocusedIndex(-1)
    }
  }

  return (
    <div className="flex flex-col min-h-screen w-full relative bg-[#ffffff]">
      <header className="w-full bg-[#ffffff] border-b border-gray-100 sticky top-0 z-40 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* BAGIAN LOGO */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-1.5 text-xl font-black tracking-tight text-gray-950">
              <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 flex-shrink-0 border border-gray-100">
                <img src="/favicon.ico" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <span className="hidden md:inline">Ne<span className="text-red-600">co</span></span>
            </Link>
          </div>

          {/* KOLOM PENCARIAN DENGAN FITUR SUGGESTION */}
          <form 
            ref={searchContainerRef}
            onSubmit={handleSearch} 
            className="flex-1 mx-2 md:mx-4 block relative"
          >
            <div className="relative w-full flex items-center">
              <input
                type="text"
                placeholder={`Cari ${searchType}...`}
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown} // Pemicu event keyboard ditambahkan di sini
                className="w-full pl-10 pr-28 py-2 bg-gray-50 border border-gray-200 text-sm rounded-xl focus:outline-none focus:border-red-500 focus:bg-white transition-colors text-gray-900 placeholder-gray-400"
              />
              
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-gray-400" />
                )}
              </div>
              
              {/* KOTAK DROPDOWN CUSTOM DI BAGIAN KANAN DALAM INPUT */}
              <div ref={searchTypeRef} className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center z-10">
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchTypeDropdown(!showSearchTypeDropdown)
                    setShowSuggestions(false)
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-950 transition-colors shadow-sm focus:outline-none"
                >
                  <span className="capitalize">{searchType}</span>
                  <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${showSearchTypeDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* MENU DROPDOWN TIPE */}
                {showSearchTypeDropdown && (
                  <div className="absolute right-0 top-full mt-1.5 w-28 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchType('toko')
                        setShowSearchTypeDropdown(false)
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${searchType === 'toko' ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      Toko
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchType('produk')
                        setShowSearchTypeDropdown(false)
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${searchType === 'produk' ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      Produk
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* BOX PANEL SARAN PENCARIAN */}
            {showSuggestions && searchQuery.trim() && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                {suggestions.length > 0 ? (
                  <div className="py-1.5">
                    {suggestions.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSuggestionClick(item.display)}
                        onMouseEnter={() => setFocusedIndex(index)} // Agar saat mouse digeser, indeks fokusnya ikut sinkron
                        className={`w-full flex items-center gap-3 px-3.5 py-2 text-left text-sm transition-colors ${
                          index === focusedIndex ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Search className={`w-3.5 h-3.5 flex-shrink-0 ${index === focusedIndex ? 'text-red-500' : 'text-gray-400'}`} />
                        <span className="truncate">{item.display}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  !isSearching && (
                    <div className="px-4 py-3 text-xs text-gray-400 text-center">
                      Tidak ditemukan {searchType} dengan nama "{searchQuery}"
                    </div>
                  )
                )}
              </div>
            )}
          </form>

          {/* AREA UTAMA / MENU HAMBURGER */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div ref={profileRef}>
              {loading ? (
                <div className="h-8 w-8 bg-gray-100 rounded-xl animate-pulse" />
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex text-gray-500 hover:text-gray-950 items-center justify-center flex-shrink-0 focus:outline-none transition-all active:scale-90"
                    aria-label="Toggle menu"
                  >
                    {showProfileDropdown ? (
                      <X className="w-5 h-5 transition-transform rotate-0 hover:rotate-90 duration-200 text-red-600" />
                    ) : (
                      <Menu className="w-5 h-5" />
                    )}
                  </button>

                  {/* DROPDOWN MENU */}
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50 divide-y divide-gray-100">
                      
                      <div className="px-4 py-2.5 bg-gray-50/50">
                        <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Akun Terhubung</p>
                        <p className="text-xs font-black truncate text-gray-900 mt-0.5">{user.email}</p>
                      </div>

                      <div className="py-1">
                        <button 
                          onClick={() => {
                            setShowProfileDropdown(false)
                            setIsProfileOpen(true)
                          }} 
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50/50 text-xs font-semibold text-gray-700 hover:text-red-600 transition-colors text-left"
                        >
                          <UserIcon className="w-4 h-4 text-gray-500" /> 
                          <span>Profil Saya</span>
                        </button>

                        <button 
                          onClick={() => {
                            setShowProfileDropdown(false)
                            setIsOrdersOpen(true)
                          }} 
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50/50 text-xs font-semibold text-gray-700 hover:text-red-600 transition-colors text-left"
                        >
                          <Package className="w-4 h-4 text-gray-500" /> 
                          <span>Pesanan Saya</span>
                        </button>

                        <Link 
                          href="/transactions" 
                          onClick={() => setShowProfileDropdown(false)} 
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50/50 text-xs font-semibold text-gray-700 hover:text-red-600 transition-colors"
                        >
                          <History className="w-4 h-4 text-gray-500" /> 
                          <span>Histori Transaksi</span>
                        </Link>
                      </div>

                      <div className="py-1">
                        <button 
                          onClick={() => {
                            setShowProfileDropdown(false)
                            setIsEmployeeOpen(true)
                          }} 
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-red-50/50 text-xs font-semibold text-gray-700 hover:text-red-600 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Briefcase className="w-4 h-4 text-red-600" /> 
                            <span>Akses Karyawan</span>
                          </div>
                          {employeeMarkets.length > 0 && (
                            <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold rounded-full px-2 py-0.5">
                              {employeeMarkets.length}
                            </span>
                          )}
                        </button>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false)
                            setIsStoreOpen(true)
                          }}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-red-50/50 text-xs font-bold text-gray-800 hover:text-red-600 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <Store className="w-4 h-4 text-red-600" />
                            <span>Toko Saya</span>
                          </div>
                          {userMarkets.length > 0 && (
                            <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold rounded-full px-2 py-0.5">
                              {userMarkets.length}
                            </span>
                          )}
                        </button>

                        {userMarkets.length > 0 ? (
                          <div className="ml-7 mr-3 my-1 pl-3 border-l-2 border-red-100 space-y-1">
                            {userMarkets.map((market) => {
                              const logoUrl = getLogoUrl(market.market_logo_url)
                              return (
                                <Link
                                  key={market.id}
                                  href={`/dashboard/${market.id}`}
                                  onClick={() => setShowProfileDropdown(false)}
                                  className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-red-50 text-xs font-medium text-gray-600 hover:text-red-700 rounded-lg transition-colors"
                                >
                                  <div className="w-5 h-5 rounded-md overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center">
                                    {logoUrl ? (
                                      <img
                                        src={logoUrl}
                                        alt={market.market_name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none'
                                        }}
                                      />
                                    ) : (
                                      <Store className="w-3 h-3 text-gray-400" />
                                    )}
                                  </div>
                                  <span className="truncate">{market.market_name}</span>
                                </Link>
                              )
                            })}
                          </div>
                        ) : (
                          <Link
                            href="/seller/register"
                            onClick={() => setShowProfileDropdown(false)}
                            className="flex items-center gap-2 mx-3 my-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Mulai Buka Toko</span>
                          </Link>
                        )}
                      </div>

                      <div className="pt-1">
                        <button 
                          onClick={handleLogout} 
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> 
                          <span>Keluar</span>
                        </button>
                      </div>

                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors">
                  Masuk
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full relative">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-4">{children}</div>
      </main>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} />
      <OrdersModal isOpen={isOrdersOpen} onClose={() => setIsOrdersOpen(false)} user={user} />
      <EmployeeModal isOpen={isEmployeeOpen} onClose={() => setIsEmployeeOpen(false)} user={user} />
      <StoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} userMarkets={userMarkets} />
    </div>
  )
}