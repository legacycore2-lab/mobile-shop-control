// src/lib/notificationSound.ts
// نغمة إشعار مولّدة بالكود (بدون ملفات صوت) + تفضيل الكتم
import { readJson, writeJson } from '@/lib/clientStorage'

const SOUND_KEY = 'notifications:sound'

type AudioCtor = typeof AudioContext

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (ctx) return ctx
  const Ctor: AudioCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  return ctx
}

// المتصفحات بتمنع الصوت قبل أول تفاعل — نفعّله عند أول ضغطة/لمسة
export function unlockNotificationAudio(): () => void {
  const unlock = () => {
    const c = getContext()
    if (c && c.state === 'suspended') void c.resume()
  }
  const events = ['pointerdown', 'keydown'] as const
  events.forEach(e => window.addEventListener(e, unlock, { once: true }))
  return () => events.forEach(e => window.removeEventListener(e, unlock))
}

export function isSoundEnabled(): boolean {
  return readJson<boolean>(SOUND_KEY, true)
}

export function setSoundEnabled(enabled: boolean): void {
  writeJson(SOUND_KEY, enabled)
}

function tone(c: AudioContext, freq: number, start: number, duration: number): void {
  const osc  = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

// نغمة من نوتتين صاعدتين (ding-dong خفيفة)
export function playNotificationSound(): void {
  const c = getContext()
  if (!c || c.state !== 'running') return
  const t = c.currentTime
  tone(c, 880,     t,        0.35)
  tone(c, 1318.5,  t + 0.14, 0.55)
}
