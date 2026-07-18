import { useState, useEffect, useRef, useCallback } from 'react'

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)
  const [ttsSupported, setTtsSupported] = useState(true)

  const socketRef = useRef(null)
  const mediaRef = useRef(null)
  const streamRef = useRef(null)
  const accumulatedRef = useRef('')
  const utteranceEndTimerRef = useRef(null)
  const onUtteranceEndRef = useRef(null)

  useEffect(() => {
    setTtsSupported(typeof window.speechSynthesis !== 'undefined')
    return () => {
      window.speechSynthesis?.cancel()
      socketRef.current?.close()
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const startRecording = useCallback(async (onUtteranceEnd) => {
    onUtteranceEndRef.current = onUtteranceEnd
    accumulatedRef.current = ''
    setTranscript('')
    setFinalTranscript('')

    let apiKey
    try {
      const res = await fetch('/api/deepgram-key')
      const data = await res.json()
      apiKey = data.key
    } catch {
      setSupported(false)
      return
    }

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setSupported(false)
      return
    }
    streamRef.current = stream

    const socket = new WebSocket(
      `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&endpointing=600&interim_results=true&utterance_end_ms=1500&punctuate=true`,
      ['token', apiKey]
    )
    socketRef.current = socket

    socket.onopen = () => {
      setIsRecording(true)
      const audioCtx = new AudioContext({ sampleRate: 16000 })
      const source = audioCtx.createMediaStreamSource(stream)
      const processor = audioCtx.createScriptProcessor(4096, 1, 1)
      processor.onaudioprocess = (e) => {
        if (socket.readyState !== WebSocket.OPEN) return
        const input = e.inputBuffer.getChannelData(0)
        const pcm = new Int16Array(input.length)
        for (let i = 0; i < input.length; i++) {
          pcm[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff
        }
        socket.send(pcm.buffer)
      }
      source.connect(processor)
      processor.connect(audioCtx.destination)
      mediaRef.current = { audioCtx, source, processor }
    }

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'UtteranceEnd') {
        const text = accumulatedRef.current.trim()
        if (text) {
          setFinalTranscript(text)
          accumulatedRef.current = ''
          setTranscript('')
          onUtteranceEndRef.current?.(text)
        }
        return
      }

      const alt = data.channel?.alternatives?.[0]
      if (!alt) return
      const words = alt.transcript

      if (data.is_final) {
        accumulatedRef.current += (accumulatedRef.current ? ' ' : '') + words
        setTranscript(accumulatedRef.current)
      } else {
        setTranscript(accumulatedRef.current + (accumulatedRef.current ? ' ' : '') + words)
      }
    }

    socket.onerror = () => {
      setSupported(false)
      stopRecording()
    }

    socket.onclose = () => {
      setIsRecording(false)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRef.current) {
      mediaRef.current.processor.disconnect()
      mediaRef.current.source.disconnect()
      mediaRef.current.audioCtx.close()
      mediaRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
    clearTimeout(utteranceEndTimerRef.current)
    setIsRecording(false)

    const text = accumulatedRef.current.trim()
    if (text) setFinalTranscript(text)
    return text
  }, [])

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.name.includes('Google US English'))
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0]
    if (preferred) utterance.voice = preferred
    utterance.rate = 1.15
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  return {
    isRecording, transcript, finalTranscript, supported, ttsSupported,
    startRecording, stopRecording,
    speak, stopSpeaking, isSpeaking,
  }
}
