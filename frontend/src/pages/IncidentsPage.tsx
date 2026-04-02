import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import {
  listIncidents,
  createIncident,
  TERMINAL_STATUSES,
} from '@/api/incidents'
import type { IncidentCreate, IncidentStatus, IncidentPriority } from '@/api/incidents'
import { listShifts } from '@/api/shifts'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  new:         'Новый',
  in_progress: 'В работе',
  waiting:     'Ожидание',
  resolved:    'Решён',
  closed:      'Закрыт',
  rejected:    'Отклонён',
}

export const PRIORITY_LABELS: Record<IncidentPriority, string> = {
  low:      'Низкий',
  medium:   'Средний',
  high:     'Высокий',
  critical: 'Критический',
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const variants: Record<IncidentStatus, string> = {
    new:         'bg-blue-500/15 text-blue-700 border-0',
    in_progress: 'bg-orange-500/15 text-orange-700 border-0',
    waiting:     'bg-yellow-500/15 text-yellow-700 border-0',
    resolved:    'bg-green-500/15 text-green-700 border-0',
    closed:      'bg-muted text-muted-foreground border-0',
    rejected:    'bg-red-500/15 text-red-700 border-0',
  }
  return (
    <Badge className={`hover:opacity-80 ${variants[status]}`}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: IncidentPriority }) {
  const variants: Record<IncidentPriority, string> = {
    low:      'bg-muted text-muted-foreground border-0',
    medium:   'bg-blue-500/15 text-blue-700 border-0',
    high:     'bg-orange-500/15 text-orange-700 border-0',
    critical: 'bg-red-500/15 text-red-700 border-0',
  }
  return (
    <Badge className={`hover:opacity-80 ${variants[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  )
}

const PAGE_SIZE = 20

function formatDate(iso: string) {
  return format(new Date(iso), 'd MMM yyyy, HH:mm', { locale: ru })
}

const DEFAULT_FORM: IncidentCreate = { title: '', priority: 'medium', shift_id: 0 }

export default function IncidentsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<IncidentPriority | 'all'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<IncidentCreate>(DEFAULT_FORM)

  const queryParams = {
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(priorityFilter !== 'all' && { priority: priorityFilter }),
  }

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents', queryParams],
    queryFn: () => listIncidents(queryParams),
  })

  const { data: openShifts = [] } = useQuery({
    queryKey: ['shifts', 'open'],
    queryFn: () => listShifts(0, 100),
    select: (shifts) => shifts.filter((s) => !s.is_closed),
    enabled: dialogOpen,
  })

  const createMutation = useMutation({
    mutationFn: createIncident,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      toast.success('Инцидент создан')
      setDialogOpen(false)
      setForm(DEFAULT_FORM)
      navigate(`/incidents/${created.id}`)
    },
    onError: () => toast.error('Не удалось создать инцидент'),
  })

  const hasNext = incidents.length === PAGE_SIZE
  const canCreate = user?.role !== 'observer'

  const filtered = search
    ? incidents.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()))
    : incidents

  function handleFilterChange() {
    setPage(0)
  }

  return (
    <div className="p-6 space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Инциденты</h1>
          <p className="mt-1 text-sm text-muted-foreground">Регистрация и отслеживание инцидентов</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} className="mr-2" />
            Создать инцидент
          </Button>
        )}
      </div>

      {/* Фильтры */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="h-8 pl-8 w-52 text-sm"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Статус:</span>
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v as IncidentStatus | 'all'); handleFilterChange() }}
          >
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              {(Object.keys(STATUS_LABELS) as IncidentStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Приоритет:</span>
          <Select
            value={priorityFilter}
            onValueChange={(v) => { setPriorityFilter(v as IncidentPriority | 'all'); handleFilterChange() }}
          >
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              {(Object.keys(PRIORITY_LABELS) as IncidentPriority[]).map((p) => (
                <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(search || statusFilter !== 'all' || priorityFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            onClick={() => { setSearch(''); setStatusFilter('all'); setPriorityFilter('all'); setPage(0) }}
          >
            Сбросить
          </Button>
        )}
      </div>

      {/* Таблица */}
      {isLoading ? (
        <div className="text-muted-foreground py-12 text-center">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">Инциденты не найдены</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium w-14">#</th>
                <th className="px-4 py-3 text-left font-medium">Название</th>
                <th className="px-4 py-3 text-left font-medium">Приоритет</th>
                <th className="px-4 py-3 text-left font-medium">Статус</th>
                <th className="px-4 py-3 text-left font-medium">Исполнитель</th>
                <th className="px-4 py-3 text-left font-medium">Создан</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((incident) => (
                <tr
                  key={incident.id}
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-muted-foreground">{incident.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{incident.title}</div>
                    {incident.category && (
                      <div className="text-xs text-muted-foreground mt-0.5">{incident.category}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={incident.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={incident.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {incident.assignee?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(incident.created_at)}
                  </td>
                </tr>
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

      {/* Диалог создания */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Создать инцидент</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Смена <span className="text-destructive">*</span></Label>
              {openShifts.length === 0 ? (
                <p className="text-sm text-muted-foreground border rounded-md px-3 py-2">
                  Нет открытых смен — сначала откройте смену
                </p>
              ) : (
                <Select
                  value={form.shift_id ? String(form.shift_id) : ''}
                  onValueChange={(v) => setForm((f) => ({ ...f, shift_id: Number(v) }))}
                >
                  <SelectTrigger><SelectValue placeholder="Выберите смену..." /></SelectTrigger>
                  <SelectContent>
                    {openShifts.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        Смена #{s.id} — {s.shift_type === 'day' ? 'Дневная' : 'Ночная'} · {s.author.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Название <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Кратко опишите инцидент..."
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Приоритет</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v as IncidentPriority }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="critical">Критический</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Категория</Label>
                <Input
                  placeholder="Категория..."
                  value={form.category ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Оборудование</Label>
              <Input
                placeholder="Ссылка на оборудование..."
                value={form.equipment_ref ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, equipment_ref: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Описание</Label>
              <Textarea
                placeholder="Подробное описание инцидента..."
                rows={4}
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="assign-to-me"
                type="checkbox"
                className="rounded"
                checked={form.assignee_id === user?.id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, assignee_id: e.target.checked ? user?.id : null }))
                }
              />
              <label htmlFor="assign-to-me" className="text-sm cursor-pointer">
                Назначить на себя
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setForm(DEFAULT_FORM) }}>
              Отмена
            </Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.title.trim() || !form.shift_id || createMutation.isPending}
            >
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
