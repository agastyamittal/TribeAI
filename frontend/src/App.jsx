import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Brain, MessageSquare, CheckCircle, Search } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Interview from './pages/Interview'
import Validation from './pages/Validation'
import DigitalExpert from './pages/DigitalExpert'

function NavLink({ to, icon: Icon, children }) {
  const location = useLocation()
  const active = location.pathname === to
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-amber-500/20 text-amber-400'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      }`}
    >
      <Icon size={18} />
      {children}
    </Link>
  )
}

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white no-underline">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Brain size={20} className="text-slate-900" />
            </div>
            TribeAI
          </Link>
          <nav className="flex gap-1">
            <NavLink to="/" icon={Brain}>Dashboard</NavLink>
            <NavLink to="/interview" icon={MessageSquare}>Interview</NavLink>
            <NavLink to="/validation" icon={CheckCircle}>Validation</NavLink>
            <NavLink to="/expert" icon={Search}>Digital Expert</NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/validation" element={<Validation />} />
          <Route path="/expert" element={<DigitalExpert />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
