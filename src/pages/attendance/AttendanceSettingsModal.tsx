// src/pages/attendance/AttendanceSettingsModal.tsx
import { useState, useEffect, useRef } from 'react'
import type L from 'leaflet'
import { X, MapPin, Navigation, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAttendanceSettings, useSaveAttendanceSettings } from '@/hooks/useAttendance'

interface Props { onClose: () => void }

export function AttendanceSettingsModal({ onClose }: Props) {
  const { data: settings } = useAttendanceSettings()
  const saveMut = useSaveAttendanceSettings()

  const [lat,     setLat]     = useState(30.0444)
  const [lng,     setLng]     = useState(31.2357)
  const [radius,  setRadius]  = useState(100)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [locating, setLocating] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  const mapRef      = useRef<HTMLDivElement | null>(null)
  const leafletMap  = useRef<L.Map | null>(null)
  const markerRef   = useRef<L.Marker | null>(null)
  const circleRef   = useRef<L.Circle | null>(null)

  // populate from DB
  useEffect(() => {
    if (settings) {
      setLat(settings.shop_latitude)
      setLng(settings.shop_longitude)
      setRadius(settings.allowed_radius_m)
    }
  }, [settings])

  // init leaflet after mount
  useEffect(() => {
    let destroyed = false
    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      // fix default icon path in vite
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (!mapRef.current || destroyed) return

      const map = L.map(mapRef.current).setView([lat, lng], 16)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
      const circle = L.circle([lat, lng], { radius, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.15, weight: 2 }).addTo(map)

      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        setLat(pos.lat)
        setLng(pos.lng)
        circle.setLatLng(pos)
      })

      map.on('click', (e) => {
        marker.setLatLng(e.latlng)
        circle.setLatLng(e.latlng)
        setLat(e.latlng.lat)
        setLng(e.latlng.lng)
      })

      leafletMap.current = map
      markerRef.current  = marker
      circleRef.current  = circle
      if (!destroyed) setMapReady(true)
    }
    initMap()
    return () => {
      destroyed = true
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null }
    }
  }, [])

  // update circle radius live
  useEffect(() => {
    if (circleRef.current) circleRef.current.setRadius(radius)
  }, [radius])

  // update marker + map view when lat/lng change from GPS
  useEffect(() => {
    if (!mapReady) return
    if (markerRef.current) markerRef.current.setLatLng([lat, lng])
    if (circleRef.current) circleRef.current.setLatLng([lat, lng])
    if (leafletMap.current) leafletMap.current.setView([lat, lng], 16)
  }, [lat, lng, mapReady])

  const locateMe = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setLocating(false)
      },
      () => { setError('تعذر تحديد موقعك'); setLocating(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      await saveMut.mutateAsync({ shop_latitude: lat, shop_longitude: lng, allowed_radius_m: radius })
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'حدث خطأ') }
    finally { setSaving(false) }
  }

  const inp = 'h-10 w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all'
  const lbl = 'text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block'

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <MapPin size={15} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">موقع المحل</p>
              <p className="text-xs text-gray-400">اضغط على الخريطة لتحديد الموقع أو اسحب الدبوس</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Map */}
          <div className="relative">
            <div ref={mapRef} className="w-full h-72" />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <Loader size={24} className="text-gray-400 animate-spin" />
              </div>
            )}
            {/* Locate me button overlaid on map */}
            <button
              onClick={locateMe}
              disabled={locating}
              className="absolute top-3 left-3 z-[1000] h-9 px-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-md text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {locating
                ? <Loader size={13} className="animate-spin" />
                : <Navigation size={13} className="text-blue-600" />
              }
              موقعي الحالي
            </button>
          </div>

          {/* Controls */}
          <div className="p-5 space-y-4">

            {/* Coords */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>خط العرض (Latitude)</label>
                <input
                  type="number" step="0.000001"
                  value={lat.toFixed(6)}
                  onChange={e => setLat(Number(e.target.value))}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>خط الطول (Longitude)</label>
                <input
                  type="number" step="0.000001"
                  value={lng.toFixed(6)}
                  onChange={e => setLng(Number(e.target.value))}
                  className={inp}
                />
              </div>
            </div>

            {/* Radius */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={lbl + ' mb-0'}>نطاق السماح</label>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{radius} متر</span>
              </div>
              <input
                type="range" min="50" max="1000" step="10"
                value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>50م</span>
                <span>1000م</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                الموظف لازم يكون على بعد أقل من {radius}م من المحل عشان يسجل حضوره
              </p>
            </div>

            {/* Info box */}
            <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3">
              <MapPin size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
                <p className="font-semibold">كيف تحدد الموقع؟</p>
                <p>• اضغط على أي نقطة على الخريطة</p>
                <p>• أو اسحب الدبوس الأزرق</p>
                <p>• أو استخدم زر "موقعي الحالي" لو أنت في المحل دلوقتي</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5 text-sm text-red-700 dark:text-red-400">
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <CheckCircle size={15} />
            }
            حفظ موقع المحل
          </button>
        </div>
      </div>
    </div>
  )
}
