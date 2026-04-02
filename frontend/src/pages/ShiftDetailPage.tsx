import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Lock, Plus, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import { getShift, updateShift, closeShift } from '@/api/shifts'
import type { ShiftUpdate } from '@/api/shifts'
import { listIncidents, createIncident } from '@/api/incidents'
import type { IncidentCreate, IncidentPriority } from '@/api/incidents'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StatusBadge, PriorityBadge } from '@/pages/IncidentsPage'

const SHIFT_TYPE_LABELS = { day: 'Дневная', night: 'Ночная' }

function formatDate(iso: string) {
  return format(new Date(iso), 'd MMMM yyyy, HH:mm', { locale: ru })
}

function formatShort(iso: string) {
  return format(new Date(iso), 'd MMM, HH:mm', { locale: ru })
}

const DEFAULT_INCIDENT: IncidentCreate = { title: '', priority: 'medium' }

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  const [form, setForm] = useState<ShiftUpdate>({})
  const [dirty, setDirty] = useState(false)
  const [closeDialog, setCloseDialog] = useState(false)
  const [incidentDialog, setIncidentDialog] = useState(false)
  const [incidentForm, setIncidentForm] = useState<IncidentCreate>(DEFAULT_INCIDENT)

  const { data: shift, isLoading, isError } = useQuery({
    queryKey: ['shift', id],
    queryFn: () => getShift(Number(id)),
    enabled: !!id,
  })

  const { data: shiftIncidents = [] } = useQuery({
    queryKey: ['incidents', { shift_id: Number(id) }],
    queryFn: () => listIncidents({ shift_id: Number(id), limit: 100 }),
    enabled: !!id,
  })

  useEffect(() => {
    if (shift) {
      setForm({
        equipment_status: shift.equipment_status ?? '',
        completed_works: shift.completed_works ?? '',
        open_issues: shift.open_issues ?? '',
        notes: shift.notes ?? '',
      })
      setDirty(false)
    }
  }, [shift])

  const updateMutation = useMutation({
    mutationFn: (body: ShiftUpdate) => updateShift(Number(id), body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['shift', id], updated)
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success('Смена обновлена')
      setDirty(false)
    },
    onError: () => toast.error('Не удалось сохранить изменения'),
  })

  const closeMutation = useMutation({
    mutationFn: () => closeShift(Number(id)),
    onSuccess: (updated) => {
      queryClient.setQueryData(['shift', id], updated)
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success('Смена закрыта')
      setCloseDialog(false)
    },
    onError: () => toast.error('Не удалось закрыть смену'),
  })

  const createIncidentMutation = useMutation({
    mutationFn: (body: IncidentCreate) => createIncident(body),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      toast.success('Инцидент создан')
      setIncidentDialog(false)
      setIncidentForm(DEFAULT_INCIDENT)
      navigate(`/incidents/${created.id}`)
    },
    onError: () => toast.error('Не удалось создать инцидент'),
  })

  const canEdit =
    shift &&
    !shift.is_closed &&
    (user?.role === 'admin' || user?.id === shift.author.id)

  const canCreateIncident = shift && !shift.is_closed && user?.role !== 'observer'

  function handleField(field: keyof ShiftUpdate, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setDirty(true)
  }

  function handleSave() {
    const body: ShiftUpdate = {}
    for (const key of ['equipment_status', 'completed_works', 'open_issues', 'notes'] as const) {
      const val = form[key]
      body[key] = val === '' ? null : val
    }
    updateMutation.mutate(body)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Загрузка...
      </div>
    )
  }

  if (isError || !shift) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-destructive">Смена не найдена.</p>
        <Button variant="outline" onClick={() => navigate('/shifts')}>
          <ArrowLeft size={16} className="mr-2" />
          Назад
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Шапка */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/shifts')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft size={14} />
            Смены
          </button>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            Смена #{shift.id}
            <Badge variant={shift.shift_type === 'day' ? 'outline' : 'secondary'}>
              {SHIFT_TYPE_LABELS[shift.shift_type]}
            </Badge>
            {shift.is_closed ? (
              <Badge variant="secondary">Закрыта</Badge>
            ) : (
              <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/25 border-0">
                Открыта
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Автор: {shift.author.full_name} · Начало: {formatDate(shift.started_at)}
            {shift.closed_at && ` · Закрыта: ${formatDate(shift.closed_at)}`}
          </p>
        </div>
        {canEdit && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setCloseDialog(true)}
          >
            <Lock size={14} className="mr-2" />
            Закрыть смену
          </Button>
        )}
      </div>

      <Separator />

      {/* Журнал смены */}
      <div className="space-y-5">
        <Field
          label="Состояние оборудования"
          value={form.equipment_status ?? ''}
          onChange={(v) => handleField('equipment_status', v)}
          placeholder="Опишите текущее состояние оборудования..."
          disabled={!canEdit}
          rows={4}
        />
        <Field
          label="Выполненные работы"
          value={form.completed_works ?? ''}
          onChange={(v) => handleField('completed_works', v)}
          placeholder="Что было сделано за смену..."
          disabled={!canEdit}
          rows={4}
        />
        <Field
          label="Открытые вопросы"
          value={form.open_issues ?? ''}
          onChange={(v) => handleField('open_issues', v)}
          placeholder="Что требует внимания следующей смены..."
          disabled={!canEdit}
          rows={3}
        />
        <Field
          label="Заметки"
          value={form.notes ?? ''}
          onChange={(v) => handleField('notes', v)}
          placeholder="Дополнительные заметки..."
          disabled={!canEdit}
          rows={3}
        />
      </div>

      {canEdit && (
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!dirty || updateMutation.isPending}>
            {updateMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
          {dirty && (
            <Button
              variant="outline"
              onClick={() => {
                setForm({
                  equipment_status: shift.equipment_status ?? '',
                  completed_works: shift.completed_works ?? '',
                  open_issues: shift.open_issues ?? '',
                  notes: shift.notes ?? '',
                })
                setDirty(false)
              }}
            >
              Отменить
            </Button>
          )}
        </div>
      )}

      <Separator />

      {/* Инциденты смены */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="text-muted-foreground" />
            Инциденты смены
            {shiftIncidents.length > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">
                {shiftIncidents.length}
              </Badge>
            )}
          </h2>
          {canCreateIncident && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIncidentDialog(true)}
            >
              <Plus size={14} className="mr-1.5" />
              Зарегистрировать инцидент
            </Button>
          )}
        </div>

        {shiftIncidents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
            Инцидентов за эту смену не зарегистрировано
          </p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium w-12">#</th>
                  <th className="px-4 py-2.5 text-left font-medium">Название</th>
                  <th className="px-4 py-2.5 text-left font-medium">Приоритет</th>
                  <th className="px-4 py-2.5 text-left font-medium">Статус</th>
                  <th className="px-4 py-2.5 text-left font-medium">Время</th>
                </tr>
              </thead>
              <tbody>
                {shiftIncidents.map((incident) => (
                  <tr
                    key={incident.id}
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 text-muted-foreground">{incident.id}</td>
                    <td className="px-4 py-2.5 font-medium">{incident.title}</td>
                    <td className="px-4 py-2.5"><PriorityBadge priority={incident.priority} /></td>
                    <td className="px-4 py-2.5"><StatusBadge status={incident.status} /></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatShort(incident.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Диалог создания инцидента */}
      <Dialog open={incidentDialog} onOpenChange={setIncidentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Новый инцидент в смене #{shift.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Название <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Кратко опишите инцидент..."
                value={incidentForm.title}
                onChange={(e) => setIncidentForm((f) => ({ ...f, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Приоритет</Label>
                <Select
                  value={incidentForm.priority}
                  onValueChange={(v) => setIncidentForm((f) => ({ ...f, priority: v as IncidentPriority }))}
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
                  value={incidentForm.category ?? ''}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, category: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Описание</Label>
              <Textarea
                placeholder="Подробное описание..."
                rows={3}
                value={incidentForm.description ?? ''}
                onChange={(e) => setIncidentForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setIncidentDialog(false); setIncidentForm(DEFAULT_INCIDENT) }}
            >
              Отмена
            </Button>
            <Button
              disabled={!incidentForm.title.trim() || createIncidentMutation.isPending}
              onClick={() =>
                createIncidentMutation.mutate({ ...incidentForm, shift_id: shift.id })
              }
            >
              {createIncidentMutation.isPending ? 'Создание...' : 'Создать и открыть'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Подтверждение закрытия */}
      <AlertDialog open={closeDialog} onOpenChange={setCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Закрыть смену?</AlertDialogTitle>
            <AlertDialogDescription>
              После закрытия смена станет доступна только для чтения. Это действие необратимо.
              {shiftIncidents.filter(i => ['new','in_progress','waiting'].includes(i.status)).length > 0 && (
                <span className="block mt-2 text-orange-600 font-medium">
                  Внимание: {shiftIncidents.filter(i => ['new','in_progress','waiting'].includes(i.status)).length} инцидентов смены ещё не закрыты.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => closeMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Закрыть смену
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, disabled, rows,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  disabled: boolean
  rows: number
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className="resize-none"
      />
    </div>
  )
}
