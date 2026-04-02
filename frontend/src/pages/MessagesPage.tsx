import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Bell, BellOff, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import { listMessages, createMessage, markAsRead } from '@/api/messages'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function formatDate(iso: string) {
  return format(new Date(iso), 'd MMM yyyy, HH:mm', { locale: ru })
}

export default function MessagesPage() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  const [body, setBody] = useState('')
  const [needsAttention, setNeedsAttention] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)

  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin'

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', unreadOnly],
    queryFn: () => listMessages({ unread_only: unreadOnly, limit: 100 }),
  })

  const sendMutation = useMutation({
    mutationFn: () => createMessage(body.trim(), needsAttention),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      toast.success('Сообщение отправлено')
      setBody('')
      setNeedsAttention(false)
    },
    onError: () => toast.error('Не удалось отправить сообщение'),
  })

  const readMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: (updated) => {
      queryClient.setQueryData(['messages', unreadOnly], (old: typeof messages) =>
        old.map((m) => (m.id === updated.id ? updated : m))
      )
    },
    onError: () => toast.error('Не удалось отметить как прочитанное'),
  })

  const unreadCount = messages.filter((m) => !m.is_read).length

  return (
    <div className="p-6 flex gap-6 h-[calc(100vh-0px)] max-h-full">
      {/* Левая панель — список */}
      <div className="flex flex-col flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Сообщения</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isManagerOrAdmin
                ? 'Входящие сообщения от команды'
                : 'Ваши сообщения руководству'}
            </p>
          </div>
          {isManagerOrAdmin && unreadCount > 0 && (
            <Badge className="bg-blue-500/15 text-blue-700 border-0">
              {unreadCount} непрочитанных
            </Badge>
          )}
        </div>

        {isManagerOrAdmin && (
          <div className="flex items-center gap-3">
            <Button
              variant={unreadOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUnreadOnly((v) => !v)}
            >
              {unreadOnly ? <BellOff size={14} className="mr-2" /> : <Bell size={14} className="mr-2" />}
              {unreadOnly ? 'Все' : 'Непрочитанные'}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="text-muted-foreground py-12 text-center">Загрузка...</div>
        ) : messages.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center">
            {unreadOnly ? 'Нет непрочитанных сообщений' : 'Сообщений нет'}
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto flex-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg border p-4 space-y-2 transition-colors ${
                  !msg.is_read && isManagerOrAdmin
                    ? 'bg-blue-500/5 border-blue-200'
                    : 'bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">
                        {initials(msg.author.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="text-sm font-medium">{msg.author.full_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {msg.needs_attention && (
                      <Badge className="bg-orange-500/15 text-orange-700 border-0 text-xs">
                        Требует внимания
                      </Badge>
                    )}
                    {!msg.is_read && isManagerOrAdmin ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => readMutation.mutate(msg.id)}
                        disabled={readMutation.isPending}
                      >
                        <CheckCheck size={13} className="mr-1" />
                        Прочитано
                      </Button>
                    ) : (
                      msg.is_read && isManagerOrAdmin && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCheck size={13} />
                          Прочитано
                        </span>
                      )
                    )}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap pl-9">{msg.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Правая панель — форма отправки (для всех) */}
      <div className="w-72 shrink-0">
        <div className="sticky top-0 space-y-3">
          <Separator orientation="vertical" className="hidden" />
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="font-semibold text-sm">
              {isManagerOrAdmin ? 'Ответить / уведомить' : 'Написать руководству'}
            </h2>
            <Textarea
              placeholder="Текст сообщения..."
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="resize-none text-sm"
            />
            <div className="flex items-center gap-2">
              <input
                id="needs-attention"
                type="checkbox"
                checked={needsAttention}
                onChange={(e) => setNeedsAttention(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="needs-attention" className="text-sm cursor-pointer text-muted-foreground">
                Требует внимания
              </label>
            </div>
            <Button
              className="w-full"
              size="sm"
              disabled={!body.trim() || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              <Send size={14} className="mr-2" />
              {sendMutation.isPending ? 'Отправка...' : 'Отправить'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
