import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, Trash2, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import {
  getIncident,
  updateIncident,
  changeIncidentStatus,
  setAssignee,
  listIncidentComments,
  addIncidentComment,
  deleteComment,
  ALLOWED_TRANSITIONS,
  TERMINAL_STATUSES,
} from '@/api/incidents'
import type { IncidentUpdate, IncidentStatus, IncidentPriority } from '@/api/incidents'
import { listUsers } from '@/api/users'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge, PriorityBadge, STATUS_LABELS, PRIORITY_LABELS } from './IncidentsPage'

// Метки для кнопок переходов
const TRANSITION_LABELS: Record<IncidentStatus, string> = {
  in_progress: 'Взять в работу',
  waiting:     'Отложить',
  resolved:    'Отметить решённым',
  closed:      'Закрыть',
  rejected:    'Отклонить',
  new:         'Вернуть в новые',
}

function formatDate(iso: string) {
  return format(new Date(iso), 'd MMMM yyyy, HH:mm', { locale: ru })
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  const [form, setForm] = useState<IncidentUpdate>({})
  const [dirty, setDirty] = useState(false)
  const [comment, setComment] = useState('')

  const { data: incident, isLoading, isError } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => getIncident(Number(id)),
    enabled: !!id,
  })

  const { data: comments = [] } = useQuery({
    queryKey: ['incidentComments', id],
    queryFn: () => listIncidentComments(Number(id)),
    enabled: !!id,
  })

  useEffect(() => {
    if (incident) {
      setForm({
        title:         incident.title,
        description:   incident.description ?? '',
        category:      incident.category ?? '',
        priority:      incident.priority,
        equipment_ref: incident.equipment_ref ?? '',
        resolution:    incident.resolution ?? '',
      })
      setDirty(false)
    }
  }, [incident])

  const updateMutation = useMutation({
    mutationFn: (body: IncidentUpdate) => updateIncident(Number(id), body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['incident', id], updated)
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      toast.success('Инцидент обновлён')
      setDirty(false)
    },
    onError: () => toast.error('Не удалось сохранить изменения'),
  })

  const statusMutation = useMutation({
    mutationFn: (status: IncidentStatus) => changeIncidentStatus(Number(id), status),
    onSuccess: (updated) => {
      queryClient.setQueryData(['incident', id], updated)
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      toast.success(`Статус изменён: ${STATUS_LABELS[updated.status]}`)
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail
      toast.error(detail ?? 'Не удалось изменить статус')
    },
  })

  const commentMutation = useMutation({
    mutationFn: (body: string) => addIncidentComment(Number(id), body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidentComments', id] })
      setComment('')
    },
    onError: () => toast.error('Не удалось добавить комментарий'),
  })

  const deleteCommentMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidentComments', id] }),
    onError: () => toast.error('Не удалось удалить комментарий'),
  })

  const isTerminal = incident ? TERMINAL_STATUSES.includes(incident.status) : false
  const canEdit = !!(incident && !isTerminal && (
    user?.role === 'admin' ||
    user?.id === incident.author.id ||
    user?.id === incident.assignee?.id
  ))
  const canAssign = !!(incident && !isTerminal && (user?.role === 'admin' || user?.role === 'manager'))
  const availableTransitions = incident ? ALLOWED_TRANSITIONS[incident.status] : []

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled: !!canAssign,
  })

  const assigneeMutation = useMutation({
    mutationFn: (assignee_id: number | null) => setAssignee(Number(id), assignee_id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['incident', id], updated)
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      toast.success(updated.assignee ? `Назначен: ${updated.assignee.full_name}` : 'Исполнитель снят')
    },
    onError: () => toast.error('Не удалось изменить исполнителя'),
  })

  function handleField(field: keyof IncidentUpdate, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setDirty(true)
  }

  function handleSave() {
    const body: IncidentUpdate = {}
    body.title = form.title || undefined
    const nullableFields = ['description', 'category', 'equipment_ref', 'resolution'] as const
    for (const key of nullableFields) {
      const val = form[key] as string | undefined
      body[key] = val === '' ? null : val
    }
    if (form.priority) body.priority = form.priority
    updateMutation.mutate(body)
  }

  function handleReset() {
    if (!incident) return
    setForm({
      title:         incident.title,
      description:   incident.description ?? '',
      category:      incident.category ?? '',
      priority:      incident.priority,
      equipment_ref: incident.equipment_ref ?? '',
      resolution:    incident.resolution ?? '',
    })
    setDirty(false)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Загрузка...
      </div>
    )
  }

  if (isError || !incident) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-destructive">Инцидент не найден.</p>
        <Button variant="outline" onClick={() => navigate('/incidents')}>
          <ArrowLeft size={16} className="mr-2" />
          Назад
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Шапка */}
      <div>
        <button
          onClick={() => navigate('/incidents')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft size={14} />
          Инциденты
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <h1 className="text-2xl font-semibold">Инцидент #{incident.id}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={incident.status} />
              <PriorityBadge priority={incident.priority} />
            </div>
            <p className="text-sm text-muted-foreground">
              Автор: {incident.author.full_name} · {formatDate(incident.created_at)}
              {incident.assignee && ` · Исполнитель: ${incident.assignee.full_name}`}
              {incident.closed_at && ` · Закрыт: ${formatDate(incident.closed_at)}`}
            </p>
            {incident.shift && (
              <button
                onClick={() => navigate(`/shifts/${incident.shift!.id}`)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              >
                <ClipboardList size={13} />
                Смена #{incident.shift.id} · {incident.shift.shift_type === 'day' ? 'Дневная' : 'Ночная'} · {formatDate(incident.shift.started_at)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Кнопки переходов статуса */}
      {availableTransitions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTransitions.map((target) => (
            <Button
              key={target}
              variant={target === 'rejected' ? 'destructive' : target === 'closed' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => statusMutation.mutate(target)}
              disabled={statusMutation.isPending}
            >
              {TRANSITION_LABELS[target]}
            </Button>
          ))}
        </div>
      )}

      <Separator />

      {/* Форма редактирования */}
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label>Название</Label>
          <Input
            value={form.title as string ?? ''}
            onChange={(e) => handleField('title', e.target.value)}
            disabled={!canEdit}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Приоритет</Label>
            <Select
              value={form.priority as string ?? incident.priority}
              onValueChange={(v) => { setForm((f) => ({ ...f, priority: v as IncidentPriority })); setDirty(true) }}
              disabled={!canEdit}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PRIORITY_LABELS) as IncidentPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Категория</Label>
            <Input
              value={form.category as string ?? ''}
              onChange={(e) => handleField('category', e.target.value)}
              disabled={!canEdit}
              placeholder="Категория..."
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Оборудование</Label>
          <Input
            value={form.equipment_ref as string ?? ''}
            onChange={(e) => handleField('equipment_ref', e.target.value)}
            disabled={!canEdit}
            placeholder="Ссылка на оборудование..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Исполнитель</Label>
          {canAssign ? (
            <Select
              value={incident.assignee?.id?.toString() ?? 'none'}
              onValueChange={(v) => assigneeMutation.mutate(v === 'none' ? null : Number(v))}
              disabled={assigneeMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Не назначен" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Не назначен</span>
                </SelectItem>
                {users.filter((u) => u.is_active).map((u) => (
                  <SelectItem key={u.id} value={u.id.toString()}>
                    {u.full_name}
                    <span className="ml-2 text-xs text-muted-foreground">{u.username}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm py-2 text-muted-foreground">
              {incident.assignee ? incident.assignee.full_name : 'Не назначен'}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Описание</Label>
          <Textarea
            value={form.description as string ?? ''}
            onChange={(e) => handleField('description', e.target.value)}
            disabled={!canEdit}
            placeholder="Описание инцидента..."
            rows={4}
            className="resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Решение</Label>
          <Textarea
            value={form.resolution as string ?? ''}
            onChange={(e) => handleField('resolution', e.target.value)}
            disabled={!canEdit}
            placeholder="Описание решения..."
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      {canEdit && (
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!dirty || updateMutation.isPending}>
            {updateMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
          {dirty && (
            <Button variant="outline" onClick={handleReset}>
              Отменить
            </Button>
          )}
        </div>
      )}

      <Separator />

      {/* Комментарии */}
      <div className="space-y-4">
        <h2 className="font-semibold">Комментарии</h2>

        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Комментариев пока нет</p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                  <AvatarFallback className="text-xs">{initials(c.author.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{c.author.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(c.created_at), 'd MMM, HH:mm', { locale: ru })}
                    </span>
                    {(user?.role === 'admin' || user?.id === c.author.id) && (
                      <button
                        onClick={() => deleteCommentMutation.mutate(c.id)}
                        className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm mt-0.5 whitespace-pre-wrap">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Поле ввода */}
        <div className="flex gap-2 pt-1">
          <Textarea
            placeholder="Написать комментарий..."
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && comment.trim()) {
                commentMutation.mutate(comment.trim())
              }
            }}
          />
          <Button
            size="sm"
            className="self-end"
            disabled={!comment.trim() || commentMutation.isPending}
            onClick={() => commentMutation.mutate(comment.trim())}
          >
            <Send size={14} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">Ctrl+Enter для отправки</p>
      </div>
    </div>
  )
}
