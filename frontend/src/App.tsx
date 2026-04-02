import { Navigate, Route, Routes } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '@/api/auth'
import Layout from '@/components/Layout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ShiftsPage from '@/pages/ShiftsPage'
import ShiftDetailPage from '@/pages/ShiftDetailPage'
import IncidentsPage from '@/pages/IncidentsPage'
import IncidentDetailPage from '@/pages/IncidentDetailPage'
import MessagesPage from '@/pages/MessagesPage'
import WikiPage from '@/pages/WikiPage'
import WikiArticlePage from '@/pages/WikiArticlePage'
import AuditPage from '@/pages/AuditPage'
import UsersPage from '@/pages/UsersPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  })

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Загрузка...
      </div>
    )
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="shifts" element={<ShiftsPage />} />
        <Route path="shifts/:id" element={<ShiftDetailPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="incidents/:id" element={<IncidentDetailPage />} />
        <Route path="wiki" element={<WikiPage />} />
        <Route path="wiki/:id" element={<WikiArticlePage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>
    </Routes>
  )
}
