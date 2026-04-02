import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import { listShifts, createShift } from '@/api/shifts'
import type { ShiftCreate } from '@/api/shifts'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const SHIFT_TYPE_LABELS = { day: 'Дневная', night: 'Ночная' }
const PAGE_SIZE = 20

function formatDate(iso: string) {
  return format(new Date(iso), 'd MMM yyyy, HH:mm', { locale: ru })
}

export default function ShiftsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'day' | 'night'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ShiftCreate>({ shift_type: 'day' })

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts', page],
    queryFn: () => listShifts(page * PAGE_SIZE, PAGE_SIZE),
  })

  const createMutation = useMutation({
    mutationFn: createShift,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success('Смена открыта')
      setDialogOpen(false)
      setForm({ shift_type: 'day' })
      navigate(`/shifts/${created.id}`)
    },
    onError: () => toast.error('Не удалось создать смену'),
  })

  const canCreate = user?.role !== 'observer'
  const hasNext = shifts.length === PAGE_SIZE

  const filtered = shifts.filter((s) => {
    if (search && !s.author.full_name.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter === 'open' && s.is_closed) return false
    if (statusFilter === 'closed' && !s.is_closed) return false
    if (typeFilter !== 'all' && s.shift_type !== typeFilter) return false
    return true
  })

  const hasFilters = search || statusFilter !== 'all' || typeFilter !== 'all'

  return (
    <div className="p-6 space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Смены</h1>
          <p className="mt-1 text-sm text-muted-foreground">Журнал рабочих смен</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} className="mr-2" />
            Открыть смену
          </Button>
        )}
      </div>

      {/* Фильтры */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="h-8 pl-8 w-48 text-sm"
            placeholder="Автор..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={13} />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(0) }}>
          <SelectTrigger className="h-8 w-32 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="open">Открытые</SelectItem>
            <SelectItem value="closed">Закрытые</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as typeof typeFilter); setPage(0) }}>
          <SelectTrigger className="h-8 w-32 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            <SelectItem value="day">Дневные</SelectItem>
            <SelectItem value="night">Ночные</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground"
            onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setPage(0) }}>
            Сбросить
          </Button>
        )}
      </div>

      {/* Таблица */}
      {isLoading ? (
        <div className="text-muted-foreground py-12 text-center">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">Смены не найдены</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium w-14">#</th>
                <th className="px-4 py-3 text-left font-medium">Тип</th>
                <th className="px-4 py-3 text-left font-medium">Автор</th>
                <th className="px-4 py-3 text-left font-medium">Начало</th>
                <th className="px-4 py-3 text-left font-medium">Закрыта</th>
                <th className="px-4 py-3 text-left font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((shift) => (
                <tr
                  key={shift.id}
                  onClick={() => navigate(`/shifts/${shift.id}`)}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-muted-foreground">{shift.id}</td>
                  <td className="px-4 py-3">
                    <Badge variant={shift.shift_type === 'day' ? 'outline' : 'secondary'}>
                      {SHIFT_TYPE_LABELS[shift.shift_type]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{shift.author.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(shift.started_at)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {shift.closed_at ? formatDate(shift.closed_at) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {shift.is_closed ? (
                      <Badge variant="secondary">Закрыта</Badge>
                    ) : (
                      <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/25 border-0">
                        Открыта
                      </Badge>
                    )}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm text-muted-foreground">Страница {page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {/* Диалог создания */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Открыть новую смену</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Тип смены</Label>
              <Select
                value={form.shift_type}
                onValueChange={(v) => setForm((f) => ({ ...f, shift_type: v as 'day' | 'night' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Дневная</SelectItem>
                  <SelectItem value="night">Ночная</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Состояние оборудования</Label>
              <Textarea
                placeholder="Опишите текущее состояние оборудования..."
                rows={3}
                value={form.equipment_status ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, equipment_status: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Выполненные работы</Label>
              <Textarea
                placeholder="Что было сделано..."
                rows={3}
                value={form.completed_works ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, completed_works: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Открытые вопросы</Label>
              <Textarea
                placeholder="Что требует внимания..."
                rows={2}
                value={form.open_issues ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, open_issues: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Заметки</Label>
              <Textarea
                placeholder="Дополнительные заметки..."
                rows={2}
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Создание...' : 'Открыть смену'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
