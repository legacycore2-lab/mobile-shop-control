import { cn } from '@/lib/cn'

interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  width?: string
  align?: 'right' | 'left' | 'center'
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  empty?: string
  onRowClick?: (row: T) => void
  className?: string
}

export function Table<T extends { id: string }>({
  columns, data, loading, empty = 'لا توجد بيانات', onRowClick, className,
}: TableProps<T>) {
  return (
    <div className={cn('overflow-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={cn(
                  'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap',
                  col.align === 'left'   && 'text-left',
                  col.align === 'center' && 'text-center',
                  (!col.align || col.align === 'right') && 'text-right',
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                {empty}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-gray-100 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-blue-50/50',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-gray-700',
                      col.align === 'left'   && 'text-left',
                      col.align === 'center' && 'text-center',
                      (!col.align || col.align === 'right') && 'text-right',
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
