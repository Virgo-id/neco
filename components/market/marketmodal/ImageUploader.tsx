'use client'

import { ChangeEvent } from 'react'

export interface PhotoFileItem {
  file: File;
  previewUrl: string;
}

interface ImageUploaderProps {
  marketLogoUrl: string;
  existingPhotos: string[];
  photosFiles: PhotoFileItem[];
  onLogoChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onPhotosChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveNewPhoto: (index: number) => void;
  onRemoveExistingPhoto: (url: string) => void;
}

export default function ImageUploader({
  marketLogoUrl,
  existingPhotos,
  photosFiles,
  onLogoChange,
  onPhotosChange,
  onRemoveNewPhoto,
  onRemoveExistingPhoto,
}: ImageUploaderProps) {
  const totalPhotos = existingPhotos.length + photosFiles.length

  return (
    <div className="flex flex-col gap-8 bg-gray-50 p-6 rounded-2xl border border-gray-200">
      {/* LOGO (DITENGAHKAN) */}
      <div className="flex flex-col items-center text-center">
        <label className="block text-xs font-black text-gray-900 uppercase tracking-wider mb-3">
          Logo Toko
        </label>
        <div className="flex justify-center">
          {marketLogoUrl ? (
            <div className="relative w-32 h-32 rounded-2xl border border-gray-200 overflow-hidden bg-white group shadow-sm">
              <img src={marketLogoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold cursor-pointer">
                Ganti Logo
                <input type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
              </label>
            </div>
          ) : (
            <label className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-1.5 bg-white cursor-pointer hover:border-red-500 hover:bg-red-50/20 transition-all shadow-sm">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Upload Logo</span>
              <input type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
            </label>
          )}
        </div>
      </div>

      {/* FOTO-FOTO TOKO (BAGIAN PALING BAWAH) */}
      <div className="pt-6 border-t border-gray-200/80">
        <label className="block text-xs font-black text-gray-900 uppercase tracking-wider mb-3">
          Foto Tempat / Area Toko ({totalPhotos}/5)
        </label>
        <div className="flex flex-wrap gap-3">
          {existingPhotos.map((url, index) => (
            <div key={`exist-${index}`} className="relative w-28 h-28 rounded-xl border border-gray-200 overflow-hidden bg-white group">
              <img src={url} alt="Existing Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemoveExistingPhoto(url)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {photosFiles.map((photoItem, index) => (
            <div key={`new-${index}`} className="relative w-28 h-28 rounded-xl border border-emerald-300 overflow-hidden bg-white group ring-2 ring-emerald-50">
              <img src={photoItem.previewUrl} alt="New Preview" className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                WebP
              </span>
              <button
                type="button"
                onClick={() => onRemoveNewPhoto(index)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {totalPhotos < 5 && (
            <label className="w-28 h-28 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 bg-white cursor-pointer hover:border-red-500 hover:bg-red-50/20 transition-all">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Tambah</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={onPhotosChange} />
            </label>
          )}
        </div>
      </div>
    </div>
  )
}