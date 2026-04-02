import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard, ClipboardList, AlertCircle,
  BookOpen, MessageSquare, Users, ScrollText, LogOut, Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { logout } from '@/api/auth'
import { cn } from '@/lib/utils'
import SearchModal, { openSearch } from '@/components/SearchModal'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  engineer: 'Инженер',
  manager: 'Руководитель',
  observer: 'Наблюдатель',
}

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Сводка',     end: true },
  { to: '/shifts',    icon: ClipboardList,   label: 'Смены' },
  { to: '/incidents', icon: AlertCircle,     label: 'Инциденты' },
  { to: '/wiki',      icon: BookOpen,        label: 'Wiki' },
  { to: '/messages',  icon: MessageSquare,   label: 'Сообщения' },
  { to: '/audit',     icon: ScrollText,      label: 'Аудит',      adminOnly: true },
  { to: '/users',     icon: Users,           label: 'Пользователи', adminOnly: true },
]

export default function Layout() {
  const { data: user } = useCurrentUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear()
      navigate('/login')
    },
    onError: () => toast.error('Ошибка при выходе'),
  })

  const initials = user?.full_name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  const visibleNav = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Боковая панель */}
      <aside className="flex w-56 flex-col border-r bg-card">
        {/* Логотип */}
        <div className="flex h-14 items-center px-4 font-semibold tracking-tight">
          ShiftControl
        </div>
        <Separator />

        {/* Поиск */}
        <div className="px-2 py-2">
          <button
            onClick={openSearch}
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground border border-dashed hover:border-solid hover:text-foreground transition-colors"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Поиск...</span>
            <kbd className="text-xs bg-muted px-1 py-0.5 rounded">Ctrl+K</kbd>
          </button>
        </div>

        {/* Навигация */}
        <nav className="flex-1 space-y-1 p-2">
          {visibleNav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <Separator />

        {/* Пользователь + выход */}
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user ? ROLE_LABELS[user.role] : ''}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut size={14} className="mr-2" />
            Выйти
          </Button>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <SearchModal />
    </div>
  )
}
