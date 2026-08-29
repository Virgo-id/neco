'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/utils/supabase'

interface ServiceStatus {
  is_pickup_enabled: boolean
  is_delivery_enabled: boolean
  is_order_from_table_enabled: boolean
  is_drivethru_enabled: boolean
  is_dinein_staff_enabled: boolean
}

export default function ServicesPage({
  params,
}: {
  params: Promise<{ marketid: string }>
}) {
  const { marketid } = use(params)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)

  const [services, setServices] = useState<ServiceStatus>({
    is_pickup_enabled: false,
    is_delivery_enabled: false,
    is_order_from_table_enabled: false,
    is_drivethru_enabled: false,
    is_dinein_staff_enabled: false,
  })

  useEffect(() => {
    fetchServiceStatus()

    const channel = supabase
      .channel(`realtime-services-page-${marketid}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'markets',
          filter: `id=eq.${marketid}`,
        },
        (payload) => {
          const newData = payload.new
          setServices({
            is_pickup_enabled: newData.is_pickup_enabled ?? false,
            is_delivery_enabled: newData.is_delivery_enabled ?? false,
            is_order_from_table_enabled: newData.is_order_from_table_enabled ?? false,
            is_drivethru_enabled: newData.is_drivethru_enabled ?? false,
            is_dinein_staff_enabled: newData.is_dinein_staff_enabled ?? false,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketid])

  const fetchServiceStatus = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('markets')
        .select('is_pickup_enabled, is_delivery_enabled, is_order_from_table_enabled, is_drivethru_enabled, is_dinein_staff_enabled')
        .eq('id', marketid)
        .single()

      if (error) throw error
      if (data) {
        setServices({
          is_pickup_enabled: data.is_pickup_enabled || false,
          is_delivery_enabled: data.is_delivery_enabled || false,
          is_order_from_table_enabled: data.is_order_from_table_enabled || false,
          is_drivethru_enabled: data.is_drivethru_enabled || false,
          is_dinein_staff_enabled: data.is_dinein_staff_enabled || false,
        })
      }
    } catch (err) {
      console.error('Gagal memuat status layanan:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleService = async (key: keyof ServiceStatus, currentValue: boolean) => {
    const updatedValue = !currentValue
    setSubmitting(key)
    setServices((prev) => ({ ...prev, [key]: updatedValue }))

    try {
      const { error } = await supabase
        .from('markets')
        .update({
          [key]: updatedValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', marketid)

      if (error) throw error
    } catch (err) {
      console.error(`Gagal memperbarui layanan ${key}:`, err)
      alert('Gagal memperbarui status layanan. Silakan coba lagi.')
      setServices((prev) => ({ ...prev, [key]: currentValue }))
    } finally {
      setSubmitting(null)
    }
  }

  const renderSwitchKnob = (key: keyof ServiceStatus) => {
    if (submitting === key) {
      return (
        <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin bg-transparent shrink-0" />
      )
    }
    return <span className="bg-white w-4 h-4 rounded-full transition-all shrink-0 shadow-sm" />
  }

  if (loading) {
    return (
      <div className="p-6 sm:p-8 text-center text-xs sm:text-sm font-semibold text-gray-400 animate-pulse m-4">
        Memuat konfigurasi fitur dan status layanan toko...
      </div>
    )
  }

  // Semua layanan kini diatur isAvailable: true
  const serviceList = [
    {
      key: 'is_order_from_table_enabled',
      title: 'Pesan Mandiri di Tempat (Dine-In QR Meja)',
      desc: 'Mungkinkan pelanggan memindai QR code unik di masing-masing meja untuk memesan.',
      icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z',
      isAvailable: true,
    },
    {
      key: 'is_delivery_enabled',
      title: 'Layanan Antar Rumah (Delivery)',
      desc: 'Menyediakan opsi pengiriman pesanan langsung ke titik alamat rumah pembeli.',
      icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      isAvailable: true,
    },
    {
      key: 'is_pickup_enabled',
      title: 'Ambil Di Tempat (Pickup Order)',
      desc: 'Pelanggan memesan secara mandiri dari rumah lalu mengambilnya sendiri di toko Anda.',
      icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
      isAvailable: true,
    },
    {
      key: 'is_drivethru_enabled',
      title: 'Layanan Lantap (Drive Thru)',
      desc: 'Pelanggan memesan dari kendaraan dan mengambil produk tanpa perlu turun.',
      icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16v-4a2 2 0 00-2-2h-3l-2-4H9',
      isAvailable: true,
    },
    {
      key: 'is_dinein_staff_enabled',
      title: 'Pesan di Tempat (Dine-In Antar Staff)',
      desc: 'Pelanggan memesan langsung di kasir, staff mengantarkan pesanan ke tempat duduk.',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      isAvailable: true,
    },
  ]

  return (
    <div className="space-y-6 max-w-4xl px-4 sm:px-6 py-6 mx-auto">
      {/* HEADER */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-lg sm:text-xl font-black text-gray-950">Fitur & Status Layanan</h2>
        <p className="text-xs sm:text-sm font-semibold text-gray-400 mt-1 leading-relaxed">
          Atur bagaimana pelanggan berinteraksi dan bertransaksi dengan toko Anda secara langsung
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Metode Pemesanan Tersedia
          </h4>
        </div>

        {serviceList.map((item) => {
          const keyName = item.key as keyof ServiceStatus
          const isEnabled = services[keyName]

          return (
            <div
              key={item.key}
              className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div
                  className={`p-2.5 sm:p-3 rounded-xl shrink-0 transition-colors ${
                    isEnabled
                      ? 'bg-red-50 text-red-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black leading-tight text-gray-950">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-[11px] sm:text-xs font-medium text-gray-400 leading-relaxed max-w-lg">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center pt-1 sm:pt-2 shrink-0">
                <button
                  type="button"
                  disabled={submitting !== null}
                  onClick={() => toggleService(keyName, isEnabled)}
                  className={`w-11 h-6 sm:w-12 sm:h-6 flex items-center rounded-full p-1 transition-all duration-300 ${
                    isEnabled
                      ? 'bg-red-600 justify-end cursor-pointer'
                      : 'bg-gray-200 justify-start cursor-pointer'
                  }`}
                >
                  {renderSwitchKnob(keyName)}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}