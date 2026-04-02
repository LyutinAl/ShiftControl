import { useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { ClipboardList, AlertCircle, AlertTriangle, Bell, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import { listShifts } from '@/api/shifts'
import { listIncidents, TERMINAL_STATUSES } from '@/api/incidents'
import type { IncidentStatus } from '@/api/incidents'
import { listMessages } from '@/api/messages'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { StatusBadge, PriorityBadge } from '@/pages/IncidentsPage'

const ACTIVE_STATUSES: IncidentStatus[] = ['new', 'in_progress', 'waiting']

function formatDate(iso: string) {
  return format(new Date(iso), 'd MMM, HH:mm', { locale: ru })
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  sub?: string
  color: string
}) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div className={`inline-flex rounded-md p-2 ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()

  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin'

  const results = useQueries({
    queries: [
      {
        queryKey: ['shifts', 0],
        queryFn: () => listShifts(0, 50),
      },
      {
        queryKey: ['incidentsDash'],
        queryFn: () => listIncidents({ limit: 50 }),
      },
      {
        queryKey: ['messages', true],
        queryFn: () => listMessages({ unread_only: true, limit: 100 }),
        enabled: isManagerOrAdmin,
      },
    ],
  })

  const [shiftsResult, incidentsResult, messagesResult] = results

  const shifts = shiftsResult.data ?? []
  const incidents = incidentsResult.data ?? []
  const unreadMessages = messagesResult.data ?? []

  const openShifts = shifts.filter((s) => !s.is_closed)
  const activeIncidents = incidents.filter((i) => ACTIVE_STATUSES.includes(i.status))
  const criticalIncidents = incidents.filter(
    (i) => i.priority === 'critical' && !TERMINAL_STATUSES.includes(i.status)
  )
  const recentIncidents = [...incidents].slice(0, 5)

  const isLoading = shiftsResult.isLoading || incidentsResult.isLoading

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Сводка</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: ru })}
        </p>
      </div>

      {/* Карточки */}
      <div className={`grid gap-4 ${isManagerOrAdmin ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
        <StatCard
          icon={ClipboardList}
          label="Открытых смен"
          value={isLoading ? '—' : openShifts.length}
          sub={openShifts[0] ? `Последняя: ${openShifts[0].author.full_name}` : undefined}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          icon={AlertCircle}
          label="Активных инцидентов"
          value={isLoading ? '—' : activeIncidents.length}
          sub={activeIncidents.filter((i) => i.status === 'new').length > 0
            ? `Новых: ${activeIncidents.filter((i) => i.status === 'new').length}`
            : undefined}
          color="bg-orange-500/10 text-orange-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Критических"
          value={isLoading ? '—' : criticalIncidents.length}
          sub="Незакрытых с приоритетом Критический"
          color="bg-red-500/10 text-red-600"
        />
        {isManagerOrAdmin && (
          <StatCard
            icon={Bell}
            label="Непрочитанных"
            value={messagesResult.isLoading ? '—' : unreadMessages.length}
            sub="Сообщений от команды"
            color="bg-purple-500/10 text-purple-600"
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Последние инциденты */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="font-semibold text-sm">Последние инциденты</h2>
            <button
              onClick={() => navigate('/incidents')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Все <ChevronRight size={12} />
            </button>
          </div>
          {isLoading ? (
            <div className="text-muted-foreground py-8 text-center text-sm">Загрузка...</div>
          ) : recentIncidents.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">Инцидентов нет</div>
          ) : (
            <div>
              {recentIncidents.map((incident, i) => (
                <div key={incident.id}>
                  <div
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{incident.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {incident.author.full_name} · {formatDate(incident.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <PriorityBadge priority={incident.priority} />
                      <StatusBadge status={incident.status} />
                    </div>
                  </div>
                  {i < recentIncidents.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Открытые смены */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="font-semibold text-sm">Открытые смены</h2>
            <button
              onClick={() => navigate('/shifts')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Все <ChevronRight size={12} />
            </button>
          </div>
          {isLoading ? (
            <div className="text-muted-foreground py-8 text-center text-sm">Загрузка...</div>
          ) : openShifts.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">Нет открытых смен</div>
          ) : (
            <div>
              {openShifts.slice(0, 5).map((shift, i) => (
                <div key={shift.id}>
                  <div
                    onClick={() => navigate(`/shifts/${shift.id}`)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{shift.author.full_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(shift.started_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={shift.shift_type === 'day' ? 'outline' : 'secondary'} className="text-xs">
                        {shift.shift_type === 'day' ? 'Дневная' : 'Ночная'}
                      </Badge>
                      <Badge className="bg-green-500/15 text-green-700 border-0 text-xs hover:opacity-80">
                        Открыта
                      </Badge>
                    </div>
                  </div>
                  {i < Math.min(openShifts.length, 5) - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Непрочитанные сообщения (менеджер/адм) */}
      {isManagerOrAdmin && unreadMessages.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="font-semibold text-sm">Требуют внимания</h2>
            <button
              onClick={() => navigate('/messages')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Открыть <ChevronRight size={12} />
            </button>
          </div>
          <div>
            {unreadMessages
              .filter((m) => m.needs_attention)
              .slice(0, 3)
              .map((msg, i, arr) => (
                <div key={msg.id}>
                  <div
                    onClick={() => navigate('/messages')}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{msg.author.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.body}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(msg.created_at)}
                    </span>
                  </div>
                  {i < arr.length - 1 && <Separator />}
                </div>
              ))}
            {unreadMessages.filter((m) => m.needs_attention).length === 0 && (
              <div
                onClick={() => navigate('/messages')}
                className="px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <p className="text-sm text-muted-foreground">
                  {unreadMessages.length} непрочитанных сообщений без пометки «требует внимания»
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
