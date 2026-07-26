import { useState, useEffect } from 'react'
import { BookOpen, Search, Wrench, Shield, Cpu, Gauge, Eye, Zap, User, Filter } from 'lucide-react'

const TYPE_CONFIG = {
  troubleshooting: { icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Troubleshooting' },
  technique: { icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Technique' },
  safety: { icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Safety' },
  material_behavior: { icon: Gauge, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Material Behavior' },
  machine_quirk: { icon: Cpu, color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Machine Quirk' },
  quality_check: { icon: Eye, color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Quality Check' },
}

const CONFIDENCE_BADGE = {
  high: 'bg-emerald-500/20 text-emerald-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-red-500/20 text-red-400',
}

export default function KnowledgeBase() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [machineFilter, setMachineFilter] = useState('all')

  useEffect(() => {
    fetch('/api/knowledge?status=validated')
      .then(r => r.json())
      .then(data => { setEntries(data); setLoading(false) })
  }, [])

  const machines = [...new Set(entries.map(e => e.machine))].sort()
  const types = [...new Set(entries.map(e => e.type))].sort()

  const filtered = entries.filter(entry => {
    if (typeFilter !== 'all' && entry.type !== typeFilter) return false
    if (machineFilter !== 'all' && entry.machine !== machineFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        entry.symptom.toLowerCase().includes(q) ||
        entry.diagnosis.toLowerCase().includes(q) ||
        entry.solution.toLowerCase().includes(q) ||
        entry.machine.toLowerCase().includes(q) ||
        entry.type.replace('_', ' ').includes(q) ||
        (entry._keywords || []).some(k => k.includes(q))
      )
    }
    return true
  })

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading knowledge base...</div>
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400 animate-fade-in">
        <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg">Knowledge base is empty</p>
        <p className="text-sm">Complete an interview and validate entries to populate the knowledge base</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
          <BookOpen size={28} className="text-amber-400" />
          Knowledge Base
        </h1>
        <p className="text-slate-400">Browse validated expert knowledge by machine, process, and type</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search knowledge entries..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Types</option>
            {types.map(t => (
              <option key={t} value={t}>{TYPE_CONFIG[t]?.label || t}</option>
            ))}
          </select>

          <select
            value={machineFilter}
            onChange={e => setMachineFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Machines</option>
            {machines.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <span className="px-3 py-1 rounded-full text-sm bg-slate-700 text-slate-300">
          {filtered.length} of {entries.length} entries
        </span>
        {machines.length > 0 && (
          <span className="px-3 py-1 rounded-full text-sm bg-slate-700 text-slate-300">
            {machines.length} machines
          </span>
        )}
        {types.length > 0 && (
          <span className="px-3 py-1 rounded-full text-sm bg-slate-700 text-slate-300">
            {types.length} categories
          </span>
        )}
      </div>

      <div className="space-y-4">
        {filtered.map(entry => {
          const typeConf = TYPE_CONFIG[entry.type] || TYPE_CONFIG.technique
          const Icon = typeConf.icon
          return (
            <div
              key={entry.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${typeConf.bg}`}>
                  <Icon size={18} className={typeConf.color} />
                </div>
                <span className={`text-sm font-medium ${typeConf.color} capitalize`}>
                  {entry.type.replace('_', ' ')}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-sm text-slate-400">{entry.machine}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${CONFIDENCE_BADGE[entry.confidence]}`}>
                  {entry.confidence}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1 ml-auto">
                  <User size={10} />
                  {entry.expert_name}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                {entry.symptom && (
                  <div>
                    <span className="text-slate-500 font-medium">Symptom: </span>
                    <span className="text-slate-300">{entry.symptom}</span>
                  </div>
                )}
                {entry.diagnosis && (
                  <div>
                    <span className="text-slate-500 font-medium">Diagnosis: </span>
                    <span className="text-slate-300">{entry.diagnosis}</span>
                  </div>
                )}
                {entry.solution && (
                  <div>
                    <span className="text-slate-500 font-medium">Solution: </span>
                    <span className="text-slate-300">{entry.solution}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Search size={32} className="mx-auto mb-3 opacity-40" />
            <p>No entries match your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
