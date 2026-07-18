import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Clock, BookOpen, ChevronRight } from 'lucide-react'

const ROLES = [
  { value: 'cnc_machinist', label: 'CNC Machinist' },
  { value: 'maintenance_tech', label: 'Maintenance Technician' },
  { value: 'quality_inspector', label: 'Quality Inspector' },
]

export default function Dashboard() {
  const [experts, setExperts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: 'John Doe', role: 'cnc_machinist', years_experience: 20, retirement_date: '2026-12-01' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/experts').then(r => r.json()).then(setExperts)
  }, [])

  async function addExpert(e) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/experts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const expert = await res.json()
    setExperts(prev => [...prev, expert])
    setShowForm(false)
    setLoading(false)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Plant Manager Dashboard</h1>
          <p className="text-slate-400">Manage at-risk experts and knowledge capture sessions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
        >
          <UserPlus size={18} />
          Enroll Expert
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={addExpert}
            className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md space-y-4"
          >
            <h2 className="text-xl font-bold text-white">Enroll New Expert</h2>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Years of Experience</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.years_experience}
                  onChange={e => setForm(f => ({ ...f, years_experience: parseInt(e.target.value) }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Retirement Date</label>
                <input
                  type="date"
                  required
                  value={form.retirement_date}
                  onChange={e => setForm(f => ({ ...f, retirement_date: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 cursor-pointer">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-amber-500 text-slate-900 font-semibold rounded-lg hover:bg-amber-400 disabled:opacity-50 cursor-pointer">
                {loading ? 'Enrolling...' : 'Enroll Expert'}
              </button>
            </div>
          </form>
        </div>
      )}

      {experts.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <UserPlus size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">No experts enrolled yet</p>
          <p className="text-sm">Click "Enroll Expert" to begin capturing knowledge</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {experts.map(expert => (
            <div
              key={expert.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 flex items-center justify-between hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 text-lg font-bold">
                  {expert.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{expert.name}</h3>
                  <p className="text-slate-400 text-sm">{expert.role_title} · {expert.years_experience} years</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-slate-400 text-sm"><Clock size={14} /> Sessions</div>
                  <span className="text-white font-semibold">{expert.sessions_completed}</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-slate-400 text-sm"><BookOpen size={14} /> Knowledge</div>
                  <span className="text-white font-semibold">{expert.knowledge_entries}</span>
                </div>
                <button
                  onClick={() => navigate(`/interview?expert=${expert.id}`)}
                  className="flex items-center gap-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  Start Interview <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
