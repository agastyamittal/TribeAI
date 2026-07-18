import { useState, useRef, useEffect } from 'react'
import { Search, Send, Loader2, User, Bot, BookOpen, Mic } from 'lucide-react'

export default function DigitalExpert() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)

    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
    const data = await res.json()
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: data.answer,
      sources: data.sources,
    }])
    setLoading(false)
  }

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-120px)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Search size={24} className="text-amber-400" />
          Digital Expert
        </h1>
        <p className="text-slate-400 text-sm">Ask questions and get answers sourced from validated expert knowledge</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <BookOpen size={48} className="mx-auto mb-4 opacity-40" />
              <p className="text-lg mb-2">Ask the Digital Expert</p>
              <p className="text-sm max-w-md">Try questions like:</p>
              <div className="mt-3 space-y-2">
                {[
                  "The lathe is chattering on my aluminum run. What do I check first?",
                  "What's the best way to hold tight tolerances on thin-walled parts?",
                  "How do I diagnose a spindle vibration problem?",
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="block w-full text-left text-sm text-slate-400 hover:text-amber-400 bg-slate-800/50 hover:bg-slate-800 px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className={`max-w-[75%] ${msg.role === 'user' ? '' : ''}`}>
              <div className={`rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-amber-500/20 text-amber-100 rounded-br-md'
                  : 'bg-slate-800 text-slate-200 rounded-bl-md'
              }`}>
                {msg.role === 'assistant' && (
                  <span className="text-xs text-amber-400 font-medium flex items-center gap-1 mb-1">
                    <Bot size={12} /> Digital Expert
                  </span>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.sources.map((src, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs text-slate-500 px-2">
                      <User size={10} />
                      <span>Source: {src.expert_name}</span>
                      <span className="text-slate-700">·</span>
                      <span className="capitalize">{src.type.replace('_', ' ')}</span>
                      <span className="text-slate-700">·</span>
                      <span>{src.machine}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        src.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-400' :
                        src.confidence === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {src.confidence}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 size={16} className="animate-spin text-amber-400" />
                Searching expert knowledge...
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 pt-4 border-t border-slate-800">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          disabled={loading}
        />
        <button
          type="button"
          className="bg-amber-500 hover:bg-amber-400 text-slate-900 p-3 rounded-xl transition-colors cursor-pointer"
        >
          <Mic size={20} />
        </button>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-amber-500 hover:bg-amber-400 text-slate-900 p-3 rounded-xl transition-colors disabled:opacity-30 cursor-pointer"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  )
}
