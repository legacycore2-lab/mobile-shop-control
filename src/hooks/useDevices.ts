import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { devicesService, type DeviceFormData } from '@/services/devices.service'
import type { DeviceStatus } from '@/types/database'

const KEYS = {
  all:    ['devices']            as const,
  stats:  ['devices', 'stats']   as const,
  one:    (id: string)  => ['devices', id]          as const,
  brands: ['mobile_brands']      as const,
  models: (brandId: string) => ['mobile_models', brandId] as const,
}

export function useDevices() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn:  devicesService.getAll,
  })
}

export function useDeviceStats() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn:  devicesService.getStats,
  })
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn:  () => devicesService.getById(id),
    enabled:  !!id,
  })
}

export function useBrands() {
  return useQuery({
    queryKey: KEYS.brands,
    queryFn:  devicesService.getAllBrands,
    staleTime: 5 * 60_000,
  })
}

export function useModelsByBrand(brandId: string) {
  return useQuery({
    queryKey: KEYS.models(brandId),
    queryFn:  () => devicesService.getModelsByBrand(brandId),
    enabled:  !!brandId,
    staleTime: 5 * 60_000,
  })
}

export function useCreateDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: DeviceFormData) => devicesService.create(form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
    },
  })
}

export function useUpdateDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<DeviceFormData> }) =>
      devicesService.update(id, form),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.one(id) })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
    },
  })
}

export function useUpdateDeviceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DeviceStatus }) =>
      devicesService.updateStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
    },
  })
}

export function useDeleteDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => devicesService.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
    },
  })
}

export function useCreateBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => devicesService.createBrand(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.brands }),
  })
}

export function useCreateModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ brandId, name }: { brandId: string; name: string }) =>
      devicesService.createModel(brandId, name),
    onSuccess: (_data, { brandId }) =>
      qc.invalidateQueries({ queryKey: KEYS.models(brandId) }),
  })
}
