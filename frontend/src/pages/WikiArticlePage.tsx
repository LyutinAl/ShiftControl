import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit2, Eye, Image, History, Trash2, Tag, X } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import {
  getArticle, updateArticle, deleteArticle,
  listVersions, restoreVersion, uploadImage,
} from '@/api/wiki'
import type { WikiArticleUpdate, WikiVisibility } from '@/api/wiki'
import { listUsers } from '@/api/users'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import MarkdownRenderer from '@/components/MarkdownRenderer'

const VISIBILITY_LABELS: Record<WikiVisibility, string> = {
  public:     'Публичная',
  restricted: 'Ограниченная',
  private:    'Приватная',
}

function formatDate(iso: string) {
  return format(new Date(iso), 'd MMMM yyyy, HH:mm', { locale: ru })
}

export default function WikiArticlePage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isEditing = searchParams.get('edit') === '1'
  const [preview, setPreview] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<WikiVisibility>('public')
  const [allowedUserIds, setAllowedUserIds] = useState<number[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [dirty, setDirty] = useState(false)

  const { data: article, isLoading, isError } = useQuery({
    queryKey: ['wikiArticle', id],
    queryFn: () => getArticle(Number(id)),
    enabled: !!id,
  })

  const { data: versions = [] } = useQuery({
    queryKey: ['wikiVersions', id],
    queryFn: () => listVersions(Number(id)),
    enabled: historyOpen && !!id,
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled: isEditing && visibility === 'restricted',
  })

  useEffect(() => {
    if (article) {
      setTitle(article.title)
      setContent(article.content)
      setVisibility(article.visibility)
      setAllowedUserIds(article.permissions.map((p) => p.user_id))
      setTags(article.tags)
      setDirty(false)
    }
  }, [article])

  const saveMutation = useMutation({
    mutationFn: (body: WikiArticleUpdate) => updateArticle(Number(id), body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['wikiArticle', id], updated)
      queryClient.invalidateQueries({ queryKey: ['wikiArticles'] })
      toast.success('Статья сохранена')
      setDirty(false)
      setSearchParams({})
    },
    onError: () => toast.error('Не удалось сохранить'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteArticle(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wikiArticles'] })
      navigate('/wiki')
      toast.success('Статья удалена')
    },
    onError: () => toast.error('Не удалось удалить'),
  })

  const restoreMutation = useMutation({
    mutationFn: (versionId: number) => restoreVersion(Number(id), versionId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['wikiArticle', id], updated)
      queryClient.invalidateQueries({ queryKey: ['wikiVersions', id] })
      setContent(updated.content)
      setHistoryOpen(false)
      toast.success('Версия восстановлена')
    },
    onError: () => toast.error('Не удалось восстановить версию'),
  })

  async function handleImageUpload(file: File) {
    try {
      const url = await uploadImage(file)
      const insertion = `\n![${file.name}](${url})\n`
      const ta = textareaRef.current
      if (ta) {
        const start = ta.selectionStart
        const newContent = content.slice(0, start) + insertion + content.slice(start)
        setContent(newContent)
        setDirty(true)
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = start + insertion.length
          ta.focus()
        }, 0)
      } else {
        setContent((c) => c + insertion)
        setDirty(true)
      }
    } catch {
      toast.error('Ошибка загрузки изображения')
    }
  }

  function handleSave() {
    saveMutation.mutate({
      title,
      content,
      visibility,
      tags,
      allowed_user_ids: visibility === 'restricted' ? allowedUserIds : [],
    })
  }

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t])
      setDirty(true)
    }
    setTagInput('')
  }

  const canEdit = article && (user?.role === 'admin' || user?.id === article.author.id ||
    (article.visibility === 'public') ||
    (article.visibility === 'restricted' && article.permissions.some((p) => p.user_id === user?.id)))
  const canDelete = article && (user?.role === 'admin' || user?.id === article.author.id)

  if (isLoading) return (
    <div className="flex h-full items-center justify-center text-muted-foreground">Загрузка...</div>
  )
  if (isError || !article) return (
    <div className="p-6 space-y-4">
      <p className="text-destructive">Статья не найдена.</p>
      <Button variant="outline" onClick={() => navigate('/wiki')}><ArrowLeft size={16} className="mr-2" />Назад</Button>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Тулбар */}
      <div className="flex items-center gap-2 px-6 py-3 border-b bg-card shrink-0">
        <button
          onClick={() => navigate('/wiki')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Wiki
        </button>
        <Separator orientation="vertical" className="h-4 mx-1" />

        {isEditing ? (
          <>
            <Button
              variant={preview ? 'outline' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPreview(false)}
            >
              <Edit2 size={13} className="mr-1" />
              Редактор
            </Button>
            <Button
              variant={preview ? 'ghost' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPreview(true)}
            >
              <Eye size={13} className="mr-1" />
              Предпросмотр
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image size={13} className="mr-1" />
              Изображение
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageUpload(file)
                e.target.value = ''
              }}
            />
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setSearchParams({}); setDirty(false) }}
            >
              Отмена
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!dirty || saveMutation.isPending}
              onClick={handleSave}
            >
              {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </>
        ) : (
          <>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setHistoryOpen(true)}
            >
              <History size={13} className="mr-1" />
              История
            </Button>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSearchParams({ edit: '1' })}
              >
                <Edit2 size={13} className="mr-1" />
                Редактировать
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => setDeleteDialog(true)}
              >
                <Trash2 size={13} />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Тело */}
      <div className="flex-1 overflow-hidden flex">
        {isEditing ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Метаданные + редактор */}
            {!preview ? (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Метаданные */}
                <div className="flex items-center gap-3 px-6 py-3 border-b bg-muted/30 flex-wrap">
                  <Input
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setDirty(true) }}
                    className="h-8 text-base font-semibold max-w-sm"
                    placeholder="Заголовок статьи"
                  />
                  <Select
                    value={visibility}
                    onValueChange={(v) => {
                      setVisibility(v as WikiVisibility)
                      if (v !== 'restricted') setAllowedUserIds([])
                      setDirty(true)
                    }}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Публичная</SelectItem>
                      <SelectItem value="restricted">Ограниченная</SelectItem>
                      <SelectItem value="private">Приватная</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Теги */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs gap-1">
                        {tag}
                        <button onClick={() => { setTags((t) => t.filter((x) => x !== tag)); setDirty(true) }}>
                          <X size={10} />
                        </button>
                      </Badge>
                    ))}
                    <div className="flex items-center gap-1">
                      <Tag size={12} className="text-muted-foreground" />
                      <input
                        className="text-xs bg-transparent border-none outline-none w-20 placeholder:text-muted-foreground"
                        placeholder="тег..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
                        onBlur={addTag}
                      />
                    </div>
                  </div>
                </div>
                {/* Панель доступа для ограниченных статей */}
                {visibility === 'restricted' && (
                  <div className="flex items-center gap-2 px-6 py-2 border-b bg-muted/20 flex-wrap">
                    <span className="text-xs text-muted-foreground shrink-0">Доступ:</span>
                    <span className="text-xs text-muted-foreground shrink-0 italic">
                      {article?.author.full_name} (автор)
                    </span>
                    {allUsers.filter((u) => u.id !== article?.author_id && u.is_active).map((u) => {
                      const checked = allowedUserIds.includes(u.id)
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setAllowedUserIds((ids) =>
                              checked ? ids.filter((id) => id !== u.id) : [...ids, u.id]
                            )
                            setDirty(true)
                          }}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            checked
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground'
                          }`}
                        >
                          {u.full_name}
                        </button>
                      )
                    })}
                  </div>
                )}
                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  className="flex-1 resize-none p-6 font-mono text-sm bg-background outline-none"
                  value={content}
                  onChange={(e) => { setContent(e.target.value); setDirty(true) }}
                  placeholder="Пишите Markdown здесь..."
                />
              </div>
            ) : (
              /* Предпросмотр */
              <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
                <h1 className="text-3xl font-bold mb-2">{title || 'Без заголовка'}</h1>
                <div className="flex gap-2 flex-wrap mb-6">
                  {tags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                </div>
                <MarkdownRenderer content={content} />
              </div>
            )}
          </div>
        ) : (
          /* Режим просмотра */
          <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
            <div className="mb-6 space-y-2">
              <h1 className="text-3xl font-bold">{article.title}</h1>
              <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                <span>{article.author.full_name}</span>
                <span>·</span>
                <span>Обновлено: {formatDate(article.updated_at)}</span>
                <span>·</span>
                <span>{VISIBILITY_LABELS[article.visibility]}</span>
                {article.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
            <Separator className="mb-6" />
            <MarkdownRenderer content={article.content} />
          </div>
        )}
      </div>

      {/* История версий */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>История версий</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Версий нет</p>
            ) : (
              versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{v.author.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(v.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                    </p>
                  </div>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={restoreMutation.isPending}
                      onClick={() => restoreMutation.mutate(v.id)}
                    >
                      Восстановить
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Подтверждение удаления */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить статью?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие необратимо. Статья и все её версии будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
