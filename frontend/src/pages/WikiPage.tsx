import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, BookOpen, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import { listSections, listArticles, createSection, createArticle } from '@/api/wiki'
import type { WikiVisibility } from '@/api/wiki'
import { listUsers } from '@/api/users'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
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

const VISIBILITY_LABELS: Record<WikiVisibility, string> = {
  public:     'Публичная',
  restricted: 'Ограниченная',
  private:    'Приватная',
}

const VISIBILITY_BADGE: Record<WikiVisibility, string> = {
  public:     'bg-green-500/15 text-green-700 border-0',
  restricted: 'bg-yellow-500/15 text-yellow-700 border-0',
  private:    'bg-muted text-muted-foreground border-0',
}

function formatDate(iso: string) {
  return format(new Date(iso), 'd MMM yyyy', { locale: ru })
}

export default function WikiPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  const [selectedSection, setSelectedSection] = useState<number | null>(null)
  const [articleDialog, setArticleDialog] = useState(false)
  const [sectionDialog, setSectionDialog] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newVisibility, setNewVisibility] = useState<WikiVisibility>('public')
  const [newAllowedIds, setNewAllowedIds] = useState<number[]>([])
  const [newSectionTitle, setNewSectionTitle] = useState('')

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled: newVisibility === 'restricted' && articleDialog,
  })

  const { data: sections = [] } = useQuery({
    queryKey: ['wikiSections'],
    queryFn: listSections,
  })

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['wikiArticles', selectedSection],
    queryFn: () => listArticles({ section_id: selectedSection ?? undefined }),
  })

  const createArticleMutation = useMutation({
    mutationFn: () => createArticle({
      title: newTitle.trim(),
      visibility: newVisibility,
      section_id: selectedSection,
      allowed_user_ids: newVisibility === 'restricted' ? newAllowedIds : [],
    }),
    onSuccess: (article) => {
      queryClient.invalidateQueries({ queryKey: ['wikiArticles'] })
      toast.success('Статья создана')
      setArticleDialog(false)
      setNewTitle('')
      setNewVisibility('public')
      setNewAllowedIds([])
      navigate(`/wiki/${article.id}?edit=1`)
    },
    onError: () => toast.error('Не удалось создать статью'),
  })

  const createSectionMutation = useMutation({
    mutationFn: () => createSection(newSectionTitle.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wikiSections'] })
      toast.success('Раздел создан')
      setSectionDialog(false)
      setNewSectionTitle('')
    },
    onError: () => toast.error('Не удалось создать раздел'),
  })

  const canCreate = user?.role !== 'observer'

  return (
    <div className="flex h-full">
      {/* Боковая панель разделов */}
      <aside className="w-52 shrink-0 border-r flex flex-col">
        <div className="flex items-center justify-between px-3 py-3 border-b">
          <span className="text-sm font-semibold">Разделы</span>
          {canCreate && (
            <button
              onClick={() => setSectionDialog(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Создать раздел"
            >
              <Plus size={15} />
            </button>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          <button
            onClick={() => setSelectedSection(null)}
            className={cn(
              'w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-left transition-colors',
              selectedSection === null
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <BookOpen size={14} />
            Все статьи
          </button>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSection(s.id)}
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-left transition-colors',
                selectedSection === s.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <FolderOpen size={14} />
              {s.title}
            </button>
          ))}
        </nav>
      </aside>

      {/* Основная часть */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Wiki</h1>
            <p className="mt-1 text-sm text-muted-foreground">База знаний команды</p>
          </div>
          {canCreate && (
            <Button onClick={() => setArticleDialog(true)}>
              <Plus size={16} className="mr-2" />
              Новая статья
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-muted-foreground py-12 text-center">Загрузка...</div>
        ) : articles.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center">Статей не найдено</div>
        ) : (
          <div className="space-y-2">
            {articles.map((article) => (
              <div
                key={article.id}
                onClick={() => navigate(`/wiki/${article.id}`)}
                className="rounded-lg border bg-card p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-medium truncate">{article.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs hover:opacity-80 ${VISIBILITY_BADGE[article.visibility]}`}>
                        {VISIBILITY_LABELS[article.visibility]}
                      </Badge>
                      {article.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0 text-xs text-muted-foreground space-y-0.5">
                    <div>{article.author.full_name}</div>
                    <div>{formatDate(article.updated_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Диалог новой статьи */}
      <Dialog open={articleDialog} onOpenChange={setArticleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Новая статья</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Заголовок <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Название статьи..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Видимость</Label>
              <Select
                value={newVisibility}
                onValueChange={(v) => { setNewVisibility(v as WikiVisibility); setNewAllowedIds([]) }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Публичная — видна всем</SelectItem>
                  <SelectItem value="restricted">Ограниченная — только выбранным</SelectItem>
                  <SelectItem value="private">Приватная — только автору</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newVisibility === 'restricted' && (
              <div className="space-y-1.5">
                <Label>Доступ (вы добавлены автоматически)</Label>
                <div className="border rounded-md max-h-40 overflow-y-auto divide-y">
                  {allUsers.filter((u) => u.id !== user?.id && u.is_active).map((u) => {
                    const checked = newAllowedIds.includes(u.id)
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setNewAllowedIds((ids) =>
                          checked ? ids.filter((id) => id !== u.id) : [...ids, u.id]
                        )}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-muted/50 ${checked ? 'bg-primary/5' : ''}`}
                      >
                        <span className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center text-[10px] ${checked ? 'bg-primary border-primary text-primary-foreground' : 'border-input'}`}>
                          {checked ? '✓' : ''}
                        </span>
                        <span>{u.full_name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{u.username}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArticleDialog(false)}>Отмена</Button>
            <Button
              disabled={!newTitle.trim() || createArticleMutation.isPending}
              onClick={() => createArticleMutation.mutate()}
            >
              Создать и открыть редактор
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог нового раздела */}
      <Dialog open={sectionDialog} onOpenChange={setSectionDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Новый раздел</DialogTitle></DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Название</Label>
            <Input
              placeholder="Название раздела..."
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialog(false)}>Отмена</Button>
            <Button
              disabled={!newSectionTitle.trim() || createSectionMutation.isPending}
              onClick={() => createSectionMutation.mutate()}
            >
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
