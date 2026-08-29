'use client'

import { useState, useRef, useEffect } from 'react'

interface RegencySelectDropdownProps {
  value: string
  regencies: string[]
  loading: boolean
  onSelect: (regency: string) => void
}

export default function RegencySelectDropdown({
  value,
  regencies,
  loading,
  onSelect,
}: RegencySelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Menutup dropdown jika pengguna mengklik di luar area komponen
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter daftar kota/kabupaten berdasarkan input pencarian
  const filteredRegencies = regencies.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">
        Kota / Kabupaten
      </label>

      {/* Trigger Box Dropdown */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-600 outline-none transition-all cursor-pointer flex justify-between items-center"
      >
        <span className={value ? "text-gray-900" : "text-gray-300"}>
          {value || "Pilih kota / kabupaten"}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Menu Options Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-60 flex flex-col">
          {/* Input Pencarian */}
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <input
              type="text"
              placeholder="Cari kota / kabupaten..."
              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* List Item Kota / Kabupaten */}
          <div className="overflow-y-auto flex-1 max-h-44 divide-y divide-gray-50">
            {loading ? (
              <div className="p-3 text-xs text-center text-gray-400 font-medium">Memuat data...</div>
            ) : filteredRegencies.length > 0 ? (
              filteredRegencies.map((name, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    onSelect(name)
                    setIsOpen(false)
                    setSearch('')
                  }}
                  className={`p-3 text-xs font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors ${
                    value === name ? 'bg-red-50/50 text-red-600 font-bold' : ''
                  }`}
                >
                  {name}
                </div>
              ))
            ) : (
              <div className="p-3 text-xs text-center text-gray-400">Kota / Kabupaten tidak ditemukan</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}