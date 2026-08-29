'use client'

import { useRef, useEffect } from 'react'
import RegencySelectDropdown from './MarketBasicInfoForm/RegencySelectDropdown'

interface FormDataState {
  market_name: string;
  market_username: string;
  market_phone: string;
  market_description: string;
  market_regency: string;
  market_address: string;
  maps_url: string;
}

interface MarketBasicInfoFormProps {
  formData: FormDataState;
  coordinatesInput: string;
  regencies: string[];
  loadingRegencies: boolean;
  isOpen: boolean;
  loading: boolean;
  onChangeFormData: (field: string, value: string) => void;
  onChangeCoordinates: (value: string) => void;
}

export default function MarketBasicInfoForm({
  formData,
  coordinatesInput,
  regencies,
  loadingRegencies,
  isOpen,
  loading,
  onChangeFormData,
  onChangeCoordinates,
}: MarketBasicInfoFormProps) {
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const addressRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && !loading) {
      const adjustHeight = (ref: React.RefObject<HTMLTextAreaElement | null>) => {
        if (ref.current) {
          ref.current.style.height = 'auto'
          ref.current.style.height = `${ref.current.scrollHeight}px`
        }
      }
      adjustHeight(descriptionRef)
      adjustHeight(addressRef)
    }
  }, [formData.market_description, formData.market_address, isOpen, loading])

  return (
    <div className="space-y-5">
      {/* INFORMASI UTAMA */}
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">
          Nama Toko / Lapak
        </label>
        <input
          type="text"
          required
          placeholder="Contoh: Toko Berkah Jaya"
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all"
          value={formData.market_name}
          onChange={(e) => onChangeFormData('market_name', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">
          Username Toko (ID Unik Link)
        </label>
        <input
          type="text"
          required
          placeholder="Contoh: berkah-jaya"
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all"
          value={formData.market_username}
          onChange={(e) => onChangeFormData('market_username', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">
          No. HP Operasional
        </label>
        <input
          type="tel"
          required
          placeholder="Contoh: 081234567890"
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all"
          value={formData.market_phone}
          onChange={(e) => onChangeFormData('market_phone', e.target.value)}
        />
      </div>

      {/* TEXTAREA DESKRIPSI (AUTO RESIZE) */}
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">
          Deskripsi & Info Toko
        </label>
        <textarea
          ref={descriptionRef}
          rows={2}
          placeholder="Tulis keunikan produk atau info jam operasional toko Anda..."
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none resize-none transition-all overflow-hidden"
          value={formData.market_description}
          onChange={(e) => onChangeFormData('market_description', e.target.value)}
        />
      </div>

      {/* GEOLOCATION */}
      <div className="pt-6 mt-4 border-t border-gray-100">
        <div className="text-xs font-black text-red-600 uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Lokasi Pengiriman & Alamat Toko
        </div>

        <div className="space-y-5">
          {/* TEXTAREA ALAMAT LENGKAP (AUTO RESIZE) */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">
              Alamat Lengkap Toko
            </label>
            <textarea
              ref={addressRef}
              rows={2}
              required
              placeholder="Tulis jalan, nomor rumah, RT/RW, kecamatan..."
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none resize-none transition-all overflow-hidden"
              value={formData.market_address}
              onChange={(e) => onChangeFormData('market_address', e.target.value)}
            />
          </div>

          {/* SEARCHABLE DROPDOWN KOTA / KABUPATEN */}
          <RegencySelectDropdown
            value={formData.market_regency}
            regencies={regencies}
            loading={loadingRegencies}
            onSelect={(selectedRegency) => onChangeFormData('market_regency', selectedRegency)}
          />

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">
              Koordinat Google Maps (Latitude, Longitude)
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: -7.050513, 113.655734"
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all"
              value={coordinatesInput}
              onChange={(e) => onChangeCoordinates(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5 px-1">
              Maps URL (Opsional)
            </label>
            <input
              type="url"
              placeholder="Contoh: https://maps.google.com/..."
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all"
              value={formData.maps_url}
              onChange={(e) => onChangeFormData('maps_url', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}