import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Logo from './Logo.jsx'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-rule bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/dashboard">
            <Logo />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              to="/reports"
              className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Reports
            </Link>
            <span className="hidden text-slate-600 sm:inline">{user.name}</span>
            <button
              onClick={handleLogout}
              className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
