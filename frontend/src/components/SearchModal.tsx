import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, AlertCircle, BookOpen, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { StatusBadge, PriorityBadge } from '@/pages/IncidentsPage'
import { search } from '@/api/search'

function formatDate(iso: string) {
  return format(new Date(iso), 'd MMM yyyy', { locale: ru })
}

export default function SearchModal() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Ctrl+K / Cmd+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Дебаунс 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Сбрасываем при закрытии
  useEffect(() => {
    if (!open) {
      setQuery('')
      setDebouncedQuery('')
    }
  }, [open])

  const { data, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => search(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000,
  })

  const total = (data?.incidents.length ?? 0) + (data?.articles.length ?? 0)
  const hasQuery = debouncedQuery.trim().length >= 2

  const go = useCallback((path: string) => {
    setOpen(false)
    navigate(path)
  }, [navigate])

  return (
    <>
      {/* Триггер в сайдбаре передаётся снаружи через onOpen, но можно открыть и кнопкой */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>Поиск</DialogTitle>
            <DialogDescription>Поиск по инцидентам и статьям Wiki</DialogDescription>
          </VisuallyHidden>
          {/* Поле поиска */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            {isFetching
              ? <Loader2 size={16} className="text-muted-foreground animate-spin shrink-0" />
              : <Search size={16} className="text-muted-foreground shrink-0" />
            }
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Поиск по инцидентам и Wiki..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
              Esc
            </kbd>
          </div>

          {/* Результаты */}
          <div className="max-h-[60vh] overflow-y-auto">
            {!hasQuery ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Введите минимум 2 символа
              </p>
            ) : isFetching && !data ? (
              <p className="text-sm text-muted-foreground text-center py-8">Поиск...</p>
            ) : total === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Ничего не найдено</p>
            ) : (
              <div className="divide-y">
                {/* Инциденты */}
                {(data?.incidents.length ?? 0) > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/40">
                      <AlertCircle size={12} className="text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Инциденты
                      </span>
                    </div>
                    {data!.incidents.map((incident) => (
                      <button
                        key={incident.id}
                        onClick={() => go(`/incidents/${incident.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
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
                      </button>
                    ))}
                  </div>
                )}

                {/* Wiki */}
                {(data?.articles.length ?? 0) > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/40">
                      <BookOpen size={12} className="text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Wiki
                      </span>
                    </div>
                    {data!.articles.map((article) => (
                      <button
                        key={article.id}
                        onClick={() => go(`/wiki/${article.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                      >
                        <BookOpen size={14} className="text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{article.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {article.author.full_name} · {formatDate(article.updated_at)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Хук для открытия из других компонентов — используем глобальное событие
export function openSearch() {
  window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k', bubbles: true }))
}
