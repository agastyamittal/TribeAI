import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Clock, BookOpen, ChevronRight, Zap, AlertTriangle, Loader2, Shield, Wrench, Cpu, Gauge, Eye, Search, Users, MessageSquare, CheckCircle } from 'lucide-react'

const SEVERITY_STYLE = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

const GAP_TYPE_ICON = {
  troubleshooting: Wrench,
  safety: Shield,
  machine_quirk: Cpu,
  material_behavior: Gauge,
  quality_check: Eye,
  technique: Zap,
}

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
  const [gaps, setGaps] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [gapError, setGapError] = useState('')
  const [validatedCount, setValidatedCount] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/experts').then(r => r.json()).then(setExperts)
    fetch('/api/gaps').then(r => r.json()).then(setGaps)
    fetch('/api/knowledge?status=validated').then(r => r.json()).then(data => setValidatedCount(data.length))
  }, [])

  async function analyzeGaps() {
    setAnalyzing(true)
    setGapError('')
    try {
      const res = await fetch('/api/gaps/analyze', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setGapError(data.detail || 'Failed to analyze gaps')
        return
      }
      if (data.message) {
        setGapError(data.message)
        setGaps([])
        return
      }
      setGaps(data.gaps)
    } catch {
      setGapError('Failed to connect to server')
    } finally {
      setAnalyzing(false)
    }
  }

  function startGapInterview(gap, expertId) {
    const contextParts = [
      `Knowledge gap: ${gap.area}`,
      gap.description,
      '',
      'Suggested areas to explore:',
      ...gap.suggested_questions.map(q => `- ${q}`),
    ]
    const params = new URLSearchParams({
      expert: expertId,
      trigger: 'gap',
      context: contextParts.join('\n'),
      gap_id: gap.id,
    })
    navigate(`/interview?${params}`)
  }

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

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <Users size={20} className="text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{experts.length}</p>
            <p className="text-xs text-slate-400">Experts Enrolled</p>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <MessageSquare size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{experts.reduce((sum, e) => sum + e.sessions_completed, 0)}</p>
            <p className="text-xs text-slate-400">Sessions Completed</p>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <CheckCircle size={20} className="text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{validatedCount}</p>
            <p className="text-xs text-slate-400">Validated Entries</p>
          </div>
        </div>
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

      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <AlertTriangle size={22} className="text-amber-400" />
              Knowledge Gaps
            </h2>
            <p className="text-slate-400 text-sm mt-1">Identify missing expertise areas and launch targeted interviews</p>
          </div>
          <button
            onClick={analyzeGaps}
            disabled={analyzing}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            {analyzing ? (
              <><Loader2 size={18} className="animate-spin" /> Analyzing...</>
            ) : (
              <><Search size={18} /> Analyze Gaps</>
            )}
          </button>
        </div>

        {gapError && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm px-4 py-3 rounded-lg mb-4">
            {gapError}
          </div>
        )}

        {gaps.length === 0 && !gapError && !analyzing && (
          <div className="text-center py-12 text-slate-500 border border-slate-800 rounded-xl">
            <AlertTriangle size={36} className="mx-auto mb-3 opacity-40" />
            <p>No gaps detected yet</p>
            <p className="text-sm mt-1">Click "Analyze Gaps" to scan your knowledge base for coverage holes</p>
          </div>
        )}

        {gaps.length > 0 && (
          <div className="grid gap-4">
            {gaps.map(gap => {
              const Icon = GAP_TYPE_ICON[gap.missing_type] || Zap
              const sevStyle = SEVERITY_STYLE[gap.severity] || SEVERITY_STYLE.medium
              return (
                <div
                  key={gap.id}
                  className={`bg-slate-800/50 border rounded-xl p-5 transition-colors ${
                    gap.status === 'resolved'
                      ? 'border-emerald-500/30 opacity-60'
                      : gap.status === 'in_progress'
                      ? 'border-amber-500/30'
                      : 'border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Icon size={18} className="text-slate-400" />
                        <h3 className="text-white font-semibold">{gap.area}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${sevStyle}`}>
                          {gap.severity}
                        </span>
                        {gap.status === 'in_progress' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                            interview in progress
                          </span>
                        )}
                        {gap.status === 'resolved' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                            resolved
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 text-sm mb-3">{gap.description}</p>
                      <div className="space-y-1">
                        <span className="text-xs text-slate-500 font-medium">Suggested questions:</span>
                        {gap.suggested_questions.map((q, i) => (
                          <p key={i} className="text-xs text-slate-400 pl-3">• {q}</p>
                        ))}
                      </div>
                    </div>

                    {gap.status === 'detected' && experts.length > 0 && (
                      <div className="flex-shrink-0">
                        {experts.length === 1 ? (
                          <button
                            onClick={() => startGapInterview(gap, experts[0].id)}
                            className="flex items-center gap-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Start Interview <ChevronRight size={16} />
                          </button>
                        ) : (
                          <div className="flex flex-col gap-2 items-end">
                            <select
                              id={`expert-${gap.id}`}
                              defaultValue=""
                              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-500"
                            >
                              <option value="" disabled>Pick expert</option>
                              {experts.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                const sel = document.getElementById(`expert-${gap.id}`)
                                if (!sel.value) { alert('Select an expert first'); return }
                                startGapInterview(gap, sel.value)
                              }}
                              className="flex items-center gap-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Start Interview <ChevronRight size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
