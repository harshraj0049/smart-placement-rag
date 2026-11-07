import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useApp } from './context/AppContext'
import { FEATURES } from './config'
import { homeFor } from './auth/roles'
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

// Route guard: sends logged-out visitors to /login and sends each role back to its own area.
// This is navigation only. The backend must enforce roles and college isolation on every request.
function Guard({ role, children }) {
  const { user } = useApp()
  const loc = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />
  return children
}

const FUTURE = FEATURES.futurePages // pages outside the immediate MVP, hidden unless VITE_ENABLE_FUTURE_PAGES=true

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<Guard role="student"><Shell variant="student" /></Guard>}>
        <Route index element={<StudentDashboard />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="companies" element={<Companies />} />
        <Route path="eligibility" element={<Eligibility />} />
        <Route path="history" element={<ChatHistory />} />
        {FUTURE && <Route path="guidelines" element={<Guidelines />} />}
        {FUTURE && <Route path="tickets" element={<MyTickets />} />}
        {FUTURE && <Route path="settings" element={<StudentSettings />} />}
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
      <Route path="/admin" element={<Guard role="admin"><Shell variant="admin" /></Guard>}>
        <Route index element={<AdminHome />} />
        <Route path="knowledge" element={<Knowledge />} />
        {FUTURE && <Route path="tickets" element={<TicketQueue />} />}
        {FUTURE && <Route path="review" element={<Review />} />}
        {FUTURE && <Route path="analytics" element={<Analytics />} />}
        {FUTURE && <Route path="settings" element={<AdminSettings />} />}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
      {FUTURE && (
        <Route path="/platform" element={<Guard role="super"><Shell variant="super" /></Guard>}>
          <Route index element={<Tenants />} />
          <Route path="isolation" element={<Isolation />} />
          <Route path="users" element={<PlatformUsers />} />
        </Route>
      )}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
