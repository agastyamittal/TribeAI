import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Wrench, Shield, Cpu, Gauge, Eye, Zap } from 'lucide-react'

const TYPE_CONFIG = {
  troubleshooting: { icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  technique: { icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  safety: { icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10' },
  material_behavior: { icon: Gauge, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  machine_quirk: { icon: Cpu, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  quality_check: { icon: Eye, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
}

const CONFIDENCE_BADGE = {
  high: 'bg-emerald-500/20 text-emerald-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-red-500/20 text-red-400',
}

export default function Validation() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/knowledge')
      .then(r => r.json())
      .then(data => { setEntries(data); setLoading(false) })
  }, [])

  async function handleValidation(entryId, approved) {
    const res = await fetch('/api/knowledge/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId, approved }),
    })
    const updated = await res.json()
    setEntries(prev => prev.map(e => e.id === entryId ? updated : e))
  }

  const pending = entries.filter(e => e.status === 'pending')
  const validated = entries.filter(e => e.status === 'validated')
  const rejected = entries.filter(e => e.status === 'rejected')

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading knowledge entries...</div>
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400 animate-fade-in">
        <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg">No knowledge entries yet</p>
        <p className="text-sm">Complete an interview session and extract knowledge first</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Knowledge Validation</h1>
        <p className="text-slate-400">Review and validate extracted knowledge before it goes live</p>
      </div>

      <div className="flex gap-3 mb-6">
        <span className="px-3 py-1 rounded-full text-sm bg-amber-500/20 text-amber-400">
          {pending.length} Pending
        </span>
        <span className="px-3 py-1 rounded-full text-sm bg-emerald-500/20 text-emerald-400">
          {validated.length} Validated
        </span>
        <span className="px-3 py-1 rounded-full text-sm bg-red-500/20 text-red-400">
          {rejected.length} Rejected
        </span>
      </div>

      <div className="space-y-4">
        {entries.map(entry => {
          const typeConf = TYPE_CONFIG[entry.type] || TYPE_CONFIG.technique
          const Icon = typeConf.icon
          return (
            <div
              key={entry.id}
              className={`bg-slate-800/50 border rounded-xl p-5 transition-colors ${
                entry.status === 'pending'
                  ? 'border-amber-500/30'
                  : entry.status === 'validated'
                  ? 'border-emerald-500/30'
                  : 'border-red-500/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
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
                    <span className="text-xs text-slate-500">
                      Source: {entry.expert_name}
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

                {entry.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleValidation(entry.id, true)}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                      <CheckCircle size={16} /> Validate
                    </button>
                    <button
                      onClick={() => handleValidation(entry.id, false)}
                      className="flex items-center gap-1 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                )}

                {entry.status === 'validated' && (
                  <span className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
                    <CheckCircle size={16} /> Validated
                  </span>
                )}

                {entry.status === 'rejected' && (
                  <span className="flex items-center gap-1 text-red-400 text-sm font-medium">
                    <XCircle size={16} /> Rejected
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
