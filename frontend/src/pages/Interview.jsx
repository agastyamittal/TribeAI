import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Send, Loader2, ArrowRight, Mic, MicOff, Volume2, VolumeOff, AudioLines, AlertTriangle, BookOpen, Target, Zap } from 'lucide-react'
import { useVoice } from '../hooks/useVoice'

const TRIGGERS = [
  { value: 'retirement', label: 'Retirement Knowledge Transfer', icon: BookOpen, description: 'Broad capture before an expert leaves. Covers daily processes, troubleshooting, and undocumented techniques.' },
  { value: 'incident', label: 'Critical Incident', icon: AlertTriangle, description: 'Capture how an expert diagnosed and resolved a specific event while the details are fresh.' },
  { value: 'topic', label: 'Specific Topic', icon: Target, description: 'Deep dive into a focused knowledge area the manager wants to capture.' },
  { value: 'gap', label: 'Knowledge Gap (System Detected)', icon: Zap, description: 'Address questions junior workers keep asking that the system can\'t answer well.' },
]

export default function Interview() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const expertId = searchParams.get('expert')
  const triggerParam = searchParams.get('trigger')
  const contextParam = searchParams.get('context')
  const gapIdParam = searchParams.get('gap_id')

  const [expert, setExpert] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [starting, setStarting] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [trigger, setTrigger] = useState(triggerParam || 'retirement')
  const [context, setContext] = useState(contextParam || '')
  const chatEndRef = useRef(null)
  const sessionIdRef = useRef(null)
  const textareaRef = useRef(null)
  const voice = useVoice()

  const isRecordingAny = voice.isRecording
  const currentTranscript = voice.transcript

  useEffect(() => {
    if (expertId) {
      fetch('/api/experts').then(r => r.json()).then(list => {
        setExpert(list.find(e => e.id === expertId))
      })
    }
    if (triggerParam) {
      setShowSetup(true)
    }
  }, [expertId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [currentTranscript, input])

  async function startInterview() {
    setStarting(true)
    try {
      const params = new URLSearchParams({ expert_id: expertId, trigger })
      if (context.trim()) params.set('context', context.trim())
      if (gapIdParam) params.set('gap_id', gapIdParam)
      const res = await fetch(`/api/interviews/start?${params}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.detail || 'Failed to start interview')
        return
      }
      setSessionId(data.session_id)
      setMessages([{ role: 'assistant', content: data.message }])
      setShowSetup(false)
      if (autoSpeak && voice.ttsSupported) {
        voice.speak(data.message)
      }
    } catch (err) {
      alert('Failed to connect to server')
    } finally {
      setStarting(false)
    }
  }

  async function sendMessage(e, overrideText = null) {
    if (e) e.preventDefault()
    const text = (overrideText || input).trim()
    if (!text || sending) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setSending(true)

    try {
      const res = await fetch('/api/interviews/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionIdRef.current, message: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.detail || 'Failed to get response'}` }])
        return
      }
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      if (autoSpeak && voice.ttsSupported) {
        voice.speak(data.message)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to connect to server' }])
    } finally {
      setSending(false)
    }
  }

  function toggleRecording() {
    if (voice.isRecording) {
      const text = voice.stopRecording()
      if (text) sendMessage(null, text)
    } else {
      voice.stopSpeaking()
      setInput('')
      voice.startRecording((utteranceText) => {
        sendMessage(null, utteranceText)
      })
    }
  }

  async function extractKnowledge() {
    setExtracting(true)
    try {
      const res = await fetch(`/api/extract/${sessionId}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.detail || 'Failed to extract knowledge')
        return
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Knowledge extraction complete. ${data.length} entries extracted and ready for validation.`,
      }])
      setTimeout(() => navigate('/validation'), 2000)
    } catch {
      alert('Failed to connect to server')
    } finally {
      setExtracting(false)
    }
  }

  if (!expertId) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-lg mb-2">No expert selected</p>
        <button onClick={() => navigate('/')} className="text-amber-400 hover:underline cursor-pointer">Go to Dashboard</button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Interview Session {expert ? `with ${expert.name}` : ''}
          </h1>
          <p className="text-slate-400 text-sm">
            {expert ? `${expert.role_title} · ${expert.years_experience} years experience` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {sessionId && (
            <button
              onClick={() => { setAutoSpeak(a => !a); if (autoSpeak) voice.stopSpeaking() }}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title={autoSpeak ? 'Mute AI voice' : 'Unmute AI voice'}
            >
              {autoSpeak ? <Volume2 size={18} /> : <VolumeOff size={18} />}
            </button>
          )}
          {messages.length > 4 && (
            <button
              onClick={extractKnowledge}
              disabled={extracting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {extracting ? (
                <><Loader2 size={18} className="animate-spin" /> Extracting Knowledge...</>
              ) : (
                <>Extract Knowledge <ArrowRight size={18} /></>
              )}
            </button>
          )}
        </div>
      </div>

      {!voice.supported && sessionId && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm px-4 py-2 rounded-lg mb-4 flex items-center gap-2">
          <MicOff size={16} />
          Voice input unavailable. Please use Chrome or Edge for the full voice experience, or type your responses below.
        </div>
      )}

      {showSetup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSetup(false)}>
          <div
            onClick={e => e.stopPropagation()}
            className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg space-y-5"
          >
            <h2 className="text-xl font-bold text-white">Start Interview with {expert?.name}</h2>
            <div>
              <label className="block text-sm text-slate-400 mb-3">What prompted this session?</label>
              <div className="space-y-2">
                {TRIGGERS.map(t => {
                  const Icon = t.icon
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTrigger(t.value)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors cursor-pointer flex items-start gap-3 ${
                        trigger === t.value
                          ? 'border-amber-500 bg-amber-500/10 text-white'
                          : 'border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <Icon size={18} className={`mt-0.5 flex-shrink-0 ${trigger === t.value ? 'text-amber-400' : 'text-slate-500'}`} />
                      <div>
                        <span className="font-medium block">{t.label}</span>
                        <span className="text-xs text-slate-400 block mt-0.5">{t.description}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Context {trigger === 'incident' ? '' : '(optional)'}
              </label>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder={
                  trigger === 'incident'
                    ? 'e.g. Spindle bearing failure on CNC Lathe #3, expert resolved in 2 hours yesterday...'
                    : trigger === 'topic'
                    ? 'e.g. Thin-wall machining techniques for parts under 2mm...'
                    : trigger === 'gap'
                    ? 'e.g. Junior workers keep asking about coolant flow rates and we have no captured knowledge...'
                    : 'Add any context to help focus the interview...'
                }
                rows={3}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none text-sm"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowSetup(false)}
                className="flex-1 px-4 py-2.5 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startInterview}
                disabled={starting}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-slate-900 font-semibold rounded-lg hover:bg-amber-400 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {starting ? (
                  <><Loader2 size={18} className="animate-spin" /> Starting...</>
                ) : (
                  <><Mic size={18} /> Start Voice Interview</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {!sessionId && !showSetup ? (
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={() => setShowSetup(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-lg px-8 py-4 rounded-xl transition-colors cursor-pointer flex items-center gap-3"
          >
            <Mic size={22} />
            Begin AI Interview Session
          </button>
        </div>
      ) : sessionId ? (
        <>
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-amber-500/20 text-amber-100 rounded-br-md'
                    : 'bg-slate-800 text-slate-200 rounded-bl-md'
                }`}>
                  {msg.role === 'assistant' && (
                    <span className="text-xs text-amber-400 font-medium mb-1 flex items-center gap-1">
                      TribeAI
                      {voice.isSpeaking && i === messages.length - 1 && (
                        <Volume2 size={12} className="animate-pulse" />
                      )}
                    </span>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 size={18} className="animate-spin text-amber-400" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {isRecordingAny && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 mb-2">
              <div className="flex items-center gap-3 mb-1">
                <AudioLines size={16} className="text-red-400 animate-pulse" />
                <span className="text-red-400 text-sm font-medium">Listening...</span>
                <span className="text-red-400/60 text-xs ml-auto">tap mic to finish</span>
              </div>
              {currentTranscript && (
                <p className="text-slate-300 text-sm leading-relaxed">{currentTranscript}</p>
              )}
            </div>
          )}

          <form onSubmit={(e) => sendMessage(e)} className="flex gap-3 pt-4 border-t border-slate-800 items-end">
            <textarea
              ref={textareaRef}
              value={isRecordingAny ? currentTranscript : input}
              onChange={e => setInput(e.target.value)}
              placeholder="Share your knowledge..."
              rows={1}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none overflow-hidden max-h-32"
              disabled={sending || isRecordingAny}
              readOnly={isRecordingAny}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
            />
            {voice.supported && (
              <button
                type="button"
                onClick={toggleRecording}
                disabled={sending}
                className={`p-3 rounded-xl transition-all cursor-pointer ${
                  isRecordingAny
                    ? 'bg-red-500 hover:bg-red-400 text-white animate-pulse-ring'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                }`}
                title={isRecordingAny ? 'Stop recording' : 'Start recording'}
              >
                {isRecordingAny ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            )}
            <button
              type="submit"
              disabled={sending || !input.trim() || isRecordingAny}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 p-3 rounded-xl transition-colors disabled:opacity-30 cursor-pointer"
            >
              <Send size={20} />
            </button>
          </form>
        </>
      ) : null}
    </div>
  )
}
