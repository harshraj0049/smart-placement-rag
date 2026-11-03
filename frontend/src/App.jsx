import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './context/AppContext'
import Shell from './components/Shell'
import Login from './pages/Login'
import StudentDashboard from './pages/student/Dashboard'
import Assistant from './pages/student/Assistant'
import Eligibility from './pages/student/Eligibility'
import Companies from './pages/student/Companies'
import Guidelines from './pages/student/Guidelines'
import MyTickets from './pages/student/MyTickets'
import ChatHistory from './pages/student/ChatHistory'
import StudentSettings from './pages/student/Settings'
import AdminHome from './pages/admin/Home'
import TicketQueue from './pages/admin/TicketQueue'
import Knowledge from './pages/admin/Knowledge'
import Review from './pages/admin/Review'
import Analytics from './pages/admin/Analytics'
import AdminSettings from './pages/admin/Settings'
import Tenants from './pages/super/Tenants'
import Isolation from './pages/super/Isolation'
import PlatformUsers from './pages/super/PlatformUsers'

// Role guard: a student can never open /admin and vice versa (the real check must also happen on the API).
function Guard({ role, children }) {
  const { user } = useApp()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={{ student: '/app', admin: '/admin', super: '/platform' }[user.role]} replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<Guard role="student"><Shell variant="student" /></Guard>}>
        <Route index element={<StudentDashboard />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="eligibility" element={<Eligibility />} />
        <Route path="companies" element={<Companies />} />
        <Route path="guidelines" element={<Guidelines />} />
        <Route path="tickets" element={<MyTickets />} />
        <Route path="history" element={<ChatHistory />} />
        <Route path="settings" element={<StudentSettings />} />
      </Route>
      <Route path="/admin" element={<Guard role="admin"><Shell variant="admin" /></Guard>}>
        <Route index element={<AdminHome />} />
        <Route path="tickets" element={<TicketQueue />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="review" element={<Review />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      <Route path="/platform" element={<Guard role="super"><Shell variant="super" /></Guard>}>
        <Route index element={<Tenants />} />
        <Route path="isolation" element={<Isolation />} />
        <Route path="users" element={<PlatformUsers />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
