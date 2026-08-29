// app/dashboard/[marketid]/layout.tsx
import { Metadata } from 'next'
import { supabase } from '@/utils/supabase'
import MarketDashboardLayoutClient from './MarketDashboardLayoutClient'

type Props = {
  params: Promise<{ marketid: string }>
  children: React.ReactNode
}

// Next.js otomatis memanggil fungsi ini di Server Side untuk Metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { marketid } = await params

  const { data: market } = await supabase
    .from('markets')
    .select('market_name, market_logo_url')
    .eq('id', marketid)
    .single()

  const title = market?.market_name ? `${market.market_name} - Dashboard` : 'Dashboard Toko'
  const favicon = market?.market_logo_url || '/favicon.ico'

  return {
    title: title,
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    },
  }
}

export default async function DashboardLayout({ children, params }: Props) {
  return (
    <MarketDashboardLayoutClient params={params}>
      {children}
    </MarketDashboardLayoutClient>
  )
}