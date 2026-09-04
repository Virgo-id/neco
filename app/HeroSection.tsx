'use client'

export default function HeroSection() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2">
      <section className="relative overflow-hidden w-full rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 bg-gray-50">
        <img
          src="/hero/hero.png"
          alt="Hero Banner"
          className="w-full h-auto object-cover rounded-2xl sm:rounded-3xl"
        />
      </section>
    </div>
  )
}