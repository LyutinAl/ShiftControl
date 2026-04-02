import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, UserCheck, UserX, Pencil } from 'lucide-react'
import { toast } from 'sonner'

import { listUsers, createUser, updateUser, deactivateUser, activateUser } from '@/api/users'
import type { UserCreate, UserUpdate } from '@/api/users'
import type { User } from '@/api/auth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

const ROLE_LABELS: Record<User['role'], string> = {
  admin:    'Администратор',
  engineer: 'Инженер',
  manager:  'Руководитель',
  observer: 'Наблюдатель',
}

const ROLE_BADGE: Record<User['role'], string> = {
  admin:    'bg-red-500/15 text-red-700 border-0',
  manager:  'bg-purple-500/15 text-purple-700 border-0',
  engineer: 'bg-blue-500/15 text-blue-700 border-0',
  observer: 'bg-muted text-muted-foreground border-0',
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

const EMPTY_CREATE: UserCreate = { username: '', full_name: '', password: '', role: 'engineer' }

export default function UsersPage() {
  const queryClient = useQueryClient()
  const { data: currentUser } = useCurrentUser()

  const [createDialog, setCreateDialog] = useState(false)
  const [editDialog, setEditDialog] = useState<User | null>(null)
  const [createForm, setCreateForm] = useState<UserCreate>(EMPTY_CREATE)
  const [editForm, setEditForm] = useState<UserUpdate>({})

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Пользователь создан')
      setCreateDialog(false)
      setCreateForm(EMPTY_CREATE)
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail
      toast.error(detail ?? 'Не удалось создать пользователя')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: UserUpdate }) => updateUser(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Данные обновлены')
      setEditDialog(null)
    },
    onError: () => toast.error('Не удалось обновить пользователя'),
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: () => toast.error('Не удалось заблокировать'),
  })

  const activateMutation = useMutation({
    mutationFn: activateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: () => toast.error('Не удалось разблокировать'),
  })

  function openEdit(user: User) {
    setEditForm({ full_name: user.full_name, role: user.role })
    setEditDialog(user)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Пользователи</h1>
          <p className="mt-1 text-sm text-muted-foreground">Управление учётными записями</p>
        </div>
        <Button onClick={() => setCreateDialog(true)}>
          <Plus size={16} className="mr-2" />
          Добавить
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-12 text-center">Загрузка...</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Пользователь</th>
                <th className="px-4 py-3 text-left font-medium">Логин</th>
                <th className="px-4 py-3 text-left font-medium">Роль</th>
                <th className="px-4 py-3 text-left font-medium">Статус</th>
                <th className="px-4 py-3 text-right font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{initials(user.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{user.username}</td>
                  <td className="px-4 py-3">
                    <Badge className={`hover:opacity-80 ${ROLE_BADGE[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_active ? (
                      <Badge className="bg-green-500/15 text-green-700 border-0 hover:opacity-80">Активен</Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground border-0 hover:opacity-80">Заблокирован</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => openEdit(user)}
                      >
                        <Pencil size={13} />
                      </Button>
                      {user.id !== currentUser?.id && (
                        user.is_active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deactivateMutation.mutate(user.id)}
                            disabled={deactivateMutation.isPending}
                            title="Заблокировать"
                          >
                            <UserX size={13} />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-green-600"
                            onClick={() => activateMutation.mutate(user.id)}
                            disabled={activateMutation.isPending}
                            title="Разблокировать"
                          >
                            <UserCheck size={13} />
                          </Button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Диалог создания */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Новый пользователь</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Полное имя <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Иванов Иван Иванович"
                value={createForm.full_name}
                onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Логин <span className="text-destructive">*</span></Label>
              <Input
                placeholder="ivanov"
                value={createForm.username}
                onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Пароль <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                placeholder="Минимум 6 символов"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Роль</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v as User['role'] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as User['role'][]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialog(false); setCreateForm(EMPTY_CREATE) }}>
              Отмена
            </Button>
            <Button
              disabled={!createForm.username || !createForm.full_name || !createForm.password || createMutation.isPending}
              onClick={() => createMutation.mutate(createForm)}
            >
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать: {editDialog?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Полное имя</Label>
              <Input
                value={editForm.full_name ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Роль</Label>
              <Select
                value={editForm.role ?? editDialog?.role}
                onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as User['role'] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as User['role'][]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Новый пароль <span className="text-muted-foreground text-xs">(оставьте пустым чтобы не менять)</span></Label>
              <Input
                type="password"
                placeholder="Минимум 6 символов"
                value={editForm.password ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value || undefined }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Отмена</Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => editDialog && updateMutation.mutate({ id: editDialog.id, body: editForm })}
            >
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
