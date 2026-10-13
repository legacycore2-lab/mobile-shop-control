// src/services/images.service.ts
import { imagesRepository } from '@/repositories/images.repository'

const ACCEPTED   = ['image/jpeg', 'image/png', 'image/webp']
const MAX_INPUT  = 10 * 1024 * 1024
const MAX_SIDE   = 900

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('الصورة غير صالحة')) }
    img.src = url
  })
}

// تصغير الصورة (أقصى بُعد 900px) وتحويلها WebP قبل الرفع
async function compress(file: File): Promise<Blob> {
  const img   = await loadImage(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width  = Math.round(img.width  * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('تعذّر معالجة الصورة')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('تعذّر معالجة الصورة'))), 'image/webp', 0.85))
}

export const imagesService = {
  upload: async (file: File, folder: 'products' | 'models' | 'devices'): Promise<string> => {
    if (!ACCEPTED.includes(file.type)) throw new Error('الصيغة المسموحة: JPG أو PNG أو WebP')
    if (file.size > MAX_INPUT)         throw new Error('حجم الصورة كبير (الحد الأقصى 10MB)')
    const blob = await compress(file)
    return imagesRepository.upload(`${folder}/${crypto.randomUUID()}.webp`, blob)
  },
}
