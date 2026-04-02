import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import { listAuditLogs } from '@/api/audit'
import type { ActionType } from '@/api/audit'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const ACTION_LABELS: Record<ActionType, string> = {
  create:  'Создание',
  update:  'Изменение',
  delete:  'Удаление',
  login:   'Вход',
  logout:  'Выход',
}

const ACTION_BADGE: Record<ActionType, string> = {
  create:  'bg-green-500/15 text-green-700 border-0',
  update:  'bg-blue-500/15 text-blue-700 border-0',
  delete:  'bg-red-500/15 text-red-700 border-0',
  login:   'bg-purple-500/15 text-purple-700 border-0',
  logout:  'bg-muted text-muted-foreground border-0',
}

const PAGE_SIZE = 50

function DiffRow({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  if (!value) return null
  const entries = Object.entries(value)
  if (entries.length === 0) return null
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="rounded bg-muted/50 px-2 py-1.5 font-mono text-xs space-y-0.5 max-h-32 overflow-y-auto">
        {entries.map(([k, v]) => (
          <div key={k}>
            <span className="text-muted-foreground">{k}: </span>
            <span>{JSON.stringify(v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExpandableRow({ log }: { log: ReturnType<typeof listAuditLogs> extends Promise<infer T> ? T[number] : never }) {
  const [open, setOpen] = useState(false)
  const hasDiff = log.old_value || log.new_value

  return (
    <>
      <tr
        className={`border-b last:border-0 text-sm ${hasDiff ? 'cursor-pointer hover:bg-muted/30' : ''} transition-colors`}
        onClick={() => hasDiff && setOpen((v) => !v)}
      >
        <td className="px-4 py-3 text-muted-foreground">{log.id}</td>
        <td className="px-4 py-3">
          <Badge className={`${ACTION_BADGE[log.action_type]} hover:opacity-80`}>
            {ACTION_LABELS[log.action_type]}
          </Badge>
        </td>
        <td className="px-4 py-3 font-medium">{log.entity_type}</td>
        <td className="px-4 py-3 text-muted-foreground">{log.entity_id ?? '—'}</td>
        <td className="px-4 py-3 text-muted-foreground">{log.user_id ?? '—'}</td>
        <td className="px-4 py-3 text-muted-foreground">
          {format(new Date(log.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
        </td>
        <td className="px-4 py-3 w-8">
          {hasDiff && (
            open ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRightIcon size={14} className="text-muted-foreground" />
          )}
        </td>
      </tr>
      {open && (
        <tr className="border-b bg-muted/20">
          <td colSpan={7} className="px-6 py-3">
            <div className="grid grid-cols-2 gap-4">
              <DiffRow label="До" value={log.old_value} />
              <DiffRow label="После" value={log.new_value} />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function AuditPage() {
  const [page, setPage] = useState(0)
  const [entityFilter, setEntityFilter] = useState('')

  const params = {
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    ...(entityFilter.trim() && { entity_type: entityFilter.trim() }),
  }

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit', params],
    queryFn: () => listAuditLogs(params),
  })

  const hasNext = logs.length === PAGE_SIZE

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Аудит</h1>
        <p className="mt-1 text-sm text-muted-foreground">История всех действий в системе</p>
      </div>

      {/* Фильтр */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Фильтр по типу объекта (user, shift, incident...)"
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(0) }}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-12 text-center">Загрузка...</div>
      ) : logs.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">Записей не найдено</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium w-14">#</th>
                <th className="px-4 py-3 text-left font-medium">Действие</th>
                <th className="px-4 py-3 text-left font-medium">Объект</th>
                <th className="px-4 py-3 text-left font-medium">ID</th>
                <th className="px-4 py-3 text-left font-medium">Пользователь</th>
                <th className="px-4 py-3 text-left font-medium">Время</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <ExpandableRow key={log.id} log={log} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Пагинация */}
      {(page > 0 || hasNext) && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm text-muted-foreground">Страница {page + 1}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!hasNext}>
            <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  )
}
