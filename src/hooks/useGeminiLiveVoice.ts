import { useCallback, useEffect, useRef, useState } from "react"
import {
  requestVoiceSessionToken,
  type VoiceLanguage,
  type VoiceSessionToken,
} from "../services/shramVoice"

export type VoiceStatus = "idle" | "connecting" | "listening" | "processing" | "speaking" | "disconnected" | "error"

export type VoiceTranscriptTurn = {
  user: string
  assistant: string
}

const LIVE_SOCKET_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained"

function pcmBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

function decodeBase64(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function readLiveMessage(data: unknown): Promise<Record<string, any>> {
  let payload: string
  if (typeof data === "string") payload = data
  else if (data instanceof Blob) payload = await data.text()
  else if (data instanceof ArrayBuffer) payload = new TextDecoder().decode(data)
  else if (ArrayBuffer.isView(data)) payload = new TextDecoder().decode(data)
  else throw new Error("Gemini sent an unsupported voice response format.")

  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch {
    throw new Error("Gemini returned an unreadable voice response.")
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Gemini sent an invalid voice response.")
  return parsed as Record<string, any>
}

export function useGeminiLiveVoice(language: VoiceLanguage) {
  const [status, setStatus] = useState<VoiceStatus>("idle")
  const [error, setError] = useState("")
  const [muted, setMuted] = useState(false)
  const [turns, setTurns] = useState<VoiceTranscriptTurn[]>([])
  const mountedRef = useRef(false)
  const socketRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const silentGainRef = useRef<GainNode | null>(null)
  const playbackSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set())
  const nextPlaybackTimeRef = useRef(0)
  const intentionalCloseRef = useRef(true)
  const busyRef = useRef(false)
  const generationRef = useRef(0)
  const resumeHandleRef = useRef<string | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<number | null>(null)
  const tokenAbortRef = useRef<AbortController | null>(null)
  const pendingUserTextRef = useRef("")
  const pendingAssistantTextRef = useRef("")
  const suppressPlaybackRef = useRef(false)

  const updateStatus = useCallback((next: VoiceStatus) => {
    if (mountedRef.current) setStatus(next)
  }, [])

  const updateError = useCallback((next: string) => {
    if (mountedRef.current) setError(next)
  }, [])

  const stopPlayback = useCallback(() => {
    for (const source of playbackSourcesRef.current) {
      try {
        source.stop()
      } catch {
        /* A source may already have ended. */
      }
    }
    playbackSourcesRef.current.clear()
    nextPlaybackTimeRef.current = audioContextRef.current?.currentTime ?? 0
  }, [])

  const stopMicrophoneGraph = useCallback(() => {
    workletRef.current?.port.close()
    workletRef.current?.disconnect()
    inputSourceRef.current?.disconnect()
    silentGainRef.current?.disconnect()
    workletRef.current = null
    inputSourceRef.current = null
    silentGainRef.current = null
  }, [])

  const releaseMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    const context = audioContextRef.current
    audioContextRef.current = null
    if (context && context.state !== "closed") void context.close()
    if (mountedRef.current) setMuted(false)
  }, [])

  const cleanupResources = useCallback(() => {
    intentionalCloseRef.current = true
    generationRef.current += 1
    if (reconnectTimerRef.current !== null)
      window.clearTimeout(reconnectTimerRef.current)
    reconnectTimerRef.current = null
    tokenAbortRef.current?.abort()
    tokenAbortRef.current = null
    stopPlayback()
    stopMicrophoneGraph()
    const socket = socketRef.current
    socketRef.current = null
    if (socket && socket.readyState < WebSocket.CLOSING)
      socket.close(1000, "Client disconnected")
    releaseMedia()
    resumeHandleRef.current = null
    pendingUserTextRef.current = ""
    pendingAssistantTextRef.current = ""
  }, [releaseMedia, stopMicrophoneGraph, stopPlayback])

  const appendCompletedTurn = useCallback(() => {
    const user = pendingUserTextRef.current.trim()
    const assistant = pendingAssistantTextRef.current.trim()
    pendingUserTextRef.current = ""
    pendingAssistantTextRef.current = ""
    if (!user && !assistant) return
    if (mountedRef.current)
      setTurns((current) => [...current, { user, assistant }])
  }, [])

  const playPcmAudio = useCallback(
    (base64: string, sampleRate: number) => {
      const context = audioContextRef.current
      if (!context || context.state === "closed") return
      const bytes = decodeBase64(base64)
      const sampleCount = Math.floor(bytes.byteLength / 2)
      if (!sampleCount) return
      const pcm = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      const audioBuffer = context.createBuffer(1, sampleCount, sampleRate)
      const channel = audioBuffer.getChannelData(0)
      for (let index = 0; index < sampleCount; index += 1)
        channel[index] = pcm.getInt16(index * 2, true) / 32768
      const source = context.createBufferSource()
      source.buffer = audioBuffer
      source.connect(context.destination)
      const startAt = Math.max(
        context.currentTime + 0.025,
        nextPlaybackTimeRef.current,
      )
      source.start(startAt)
      nextPlaybackTimeRef.current = startAt + audioBuffer.duration
      playbackSourcesRef.current.add(source)
      source.onended = () => playbackSourcesRef.current.delete(source)
      updateStatus("speaking")
    },
    [updateStatus],
  )

  const startMicrophoneGraph = useCallback(async () => {
    const stream = streamRef.current
    const context = audioContextRef.current
    if (!stream || !context || context.state === "closed" || workletRef.current)
      return

    await context.audioWorklet.addModule(
      `${import.meta.env.BASE_URL}worklets/shram-pcm-capture.js`,
    )
    if (!streamRef.current || !audioContextRef.current) return
    const inputSource = context.createMediaStreamSource(stream)
    const worklet = new AudioWorkletNode(context, "shram-pcm-capture", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    })
    const silentGain = context.createGain()
    silentGain.gain.value = 0
    worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      const socket = socketRef.current
      if (!socket || socket.readyState !== WebSocket.OPEN) return
      socket.send(
        JSON.stringify({
          realtimeInput: {
            audio: {
              data: pcmBufferToBase64(event.data),
              mimeType: "audio/pcm;rate=16000",
            },
          },
        }),
      )
    }
    inputSource.connect(worklet)
    worklet.connect(silentGain)
    silentGain.connect(context.destination)
    inputSourceRef.current = inputSource
    workletRef.current = worklet
    silentGainRef.current = silentGain
  }, [])

  const connectSocket = useCallback(
    async (generation: number, resumeHandle: string | null) => {
      const abortController = new AbortController()
      tokenAbortRef.current = abortController
      const tokenTimeout = window.setTimeout(
        () => abortController.abort(),
        20_000,
      )
      let token: VoiceSessionToken
      try {
        token = await requestVoiceSessionToken(language, abortController.signal)
      } catch (requestError) {
        if (abortController.signal.aborted)
          throw new Error(
            "Preparing the voice session timed out. Please retry.",
          )
        throw requestError
      } finally {
        window.clearTimeout(tokenTimeout)
        if (tokenAbortRef.current === abortController)
          tokenAbortRef.current = null
      }
      if (generation !== generationRef.current) return

      const socketUrl = new URL(LIVE_SOCKET_URL)
      socketUrl.searchParams.set("access_token", token.token)
      const socket = new WebSocket(socketUrl.toString())
      socket.binaryType = "arraybuffer"
      socketRef.current = socket

      await new Promise<void>((resolve, reject) => {
        let setupFinished = false
        let connectionReady = false
        const connectionTimeout = window.setTimeout(() => {
          if (setupFinished) return
          setupFinished = true
          socket.close()
          reject(
            new Error(
              "Gemini Live did not finish connecting. Please try again.",
            ),
          )
        }, 20_000)

        socket.onopen = () => {
          const setup = {
            setup: {
              model: `models/${token.model}`,
              generationConfig: { responseModalities: ["AUDIO"] },
              systemInstruction: {
                parts: [{ text: token.system_instruction }],
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              sessionResumption: resumeHandle ? { handle: resumeHandle } : {},
            },
          }
          socket.send(JSON.stringify(setup))
        }

        let messageQueue = Promise.resolve()
        socket.onmessage = (event) => {
          if (generation !== generationRef.current) return
          messageQueue = messageQueue
            .then(async () => {
              if (generation !== generationRef.current) return
              let message: Record<string, any>
              try {
                message = await readLiveMessage(event.data)
              } catch (parseError) {
                const detail =
                  parseError instanceof Error
                    ? parseError.message
                    : "Gemini returned an unreadable voice response."
                updateError(detail)
                if (!setupFinished) {
                  setupFinished = true
                  window.clearTimeout(connectionTimeout)
                  reject(new Error(detail))
                }
                updateStatus("error")
                intentionalCloseRef.current = true
                socket.close(1002, "Invalid Gemini Live message")
                return
              }
              if (message.setupComplete) {
                if (!setupFinished) {
                  setupFinished = true
                  connectionReady = true
                  window.clearTimeout(connectionTimeout)
                  resolve()
                }
                reconnectAttemptsRef.current = 0
                updateError("")
                updateStatus("listening")
                void startMicrophoneGraph().catch(() => {
                  updateError(
                    "Microphone audio could not be started. Reconnect and try again.",
                  )
                  updateStatus("error")
                  intentionalCloseRef.current = true
                  socketRef.current?.close(1000, "Microphone setup failed")
                  socketRef.current = null
                  stopMicrophoneGraph()
                  releaseMedia()
                })
              }
              const resumeUpdate = message.sessionResumptionUpdate
              if (
                resumeUpdate?.resumable &&
                typeof resumeUpdate.newHandle === "string"
              )
                resumeHandleRef.current = resumeUpdate.newHandle
              const content = message.serverContent
              if (content?.inputTranscription?.text) {
                pendingUserTextRef.current += content.inputTranscription.text
                updateStatus("processing")
              }
              if (content?.outputTranscription?.text)
                pendingAssistantTextRef.current +=
                  content.outputTranscription.text
              if (content?.interrupted) {
                suppressPlaybackRef.current = false
                stopPlayback()
                updateStatus("listening")
              }
              const parts = content?.modelTurn?.parts
              if (Array.isArray(parts)) {
                for (const part of parts) {
                  const inlineData = part.inlineData ?? part.inline_data
                  if (
                    typeof inlineData?.data === "string" &&
                    !suppressPlaybackRef.current
                  )
                    playPcmAudio(inlineData.data, token.output_sample_rate)
                  if (typeof part.text === "string")
                    pendingAssistantTextRef.current += part.text
                }
              }
              if (content?.turnComplete || content?.generationComplete) {
                suppressPlaybackRef.current = false
                appendCompletedTurn()
                updateStatus("listening")
              }
              if (message.goAway && resumeHandleRef.current) {
                updateStatus("connecting")
                window.setTimeout(() => {
                  if (
                    socketRef.current === socket &&
                    socket.readyState === WebSocket.OPEN
                  )
                    socket.close(1000, "Gemini session reconnect")
                }, 250)
              }
              if (message.error) {
                const detail = message.error.message
                updateError(
                  typeof detail === "string"
                    ? detail
                    : "Gemini Live ended the session.",
                )
                updateStatus("disconnected")
                socket.close()
              }
            })
            .catch((messageError) => {
              console.error(
                "Failed to process Gemini Live message",
                messageError,
              )
              updateError(
                "Could not process the voice response. Please reconnect.",
              )
              updateStatus("error")
              intentionalCloseRef.current = true
              socket.close(1011, "Voice response processing failed")
            })
        }

        socket.onerror = () => {
          if (!setupFinished) {
            setupFinished = true
            window.clearTimeout(connectionTimeout)
            reject(
              new Error(
                "Could not connect to Gemini Live. Check the voice API configuration and network.",
              ),
            )
          }
        }

        socket.onclose = () => {
          window.clearTimeout(connectionTimeout)
          if (!connectionReady) {
            if (!setupFinished) {
              setupFinished = true
              reject(
                new Error("Gemini Live closed before the session was ready."),
              )
            }
            return
          }
          if (
            generation !== generationRef.current ||
            intentionalCloseRef.current
          )
            return
          stopMicrophoneGraph()
          if (resumeHandleRef.current && reconnectAttemptsRef.current < 2) {
            reconnectAttemptsRef.current += 1
            updateStatus("connecting")
            reconnectTimerRef.current = window.setTimeout(() => {
              void connectSocket(generation, resumeHandleRef.current).catch(
                (reconnectError) => {
                  stopMicrophoneGraph()
                  releaseMedia()
                  updateError(
                    reconnectError instanceof Error
                      ? reconnectError.message
                      : "Voice reconnection failed.",
                  )
                  updateStatus("disconnected")
                },
              )
            }, reconnectAttemptsRef.current * 700)
          } else {
            releaseMedia()
            updateError(
              "The voice session disconnected. Reconnect to continue.",
            )
            updateStatus("disconnected")
          }
        }
      })
    },
    [
      appendCompletedTurn,
      language,
      playPcmAudio,
      releaseMedia,
      startMicrophoneGraph,
      stopMicrophoneGraph,
      stopPlayback,
      updateError,
      updateStatus,
    ],
  )

  const start = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    intentionalCloseRef.current = false
    reconnectAttemptsRef.current = 0
    updateError("")
    updateStatus("connecting")
    const generation = ++generationRef.current
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Microphone access is unavailable. Open Shram Bazar on HTTPS or localhost.",
        )
      if (!audioContextRef.current) audioContextRef.current = new AudioContext()
      const resumeAudio = audioContextRef.current.resume()
      void resumeAudio.catch(() => {})
      if (!streamRef.current) {
        try {
          const acquiredStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          })
          if (generation !== generationRef.current) {
            acquiredStream.getTracks().forEach((track) => track.stop())
            return
          }
          streamRef.current = acquiredStream
        } catch (permissionError) {
          const name = (permissionError as DOMException)?.name
          if (name === "NotAllowedError" || name === "PermissionDeniedError")
            throw new Error(
              "Microphone permission was denied. Allow microphone access and try again.",
            )
          if (name === "NotFoundError" || name === "DevicesNotFoundError")
            throw new Error(
              "No microphone was found. Connect a microphone and try again.",
            )
          throw new Error(
            "Could not access the microphone. Check browser permissions and try again.",
          )
        }
      }
      if (generation !== generationRef.current) return
      await resumeAudio
      await connectSocket(generation, resumeHandleRef.current)
    } catch (startError) {
      if (generation !== generationRef.current) return
      intentionalCloseRef.current = true
      stopMicrophoneGraph()
      releaseMedia()
      updateError(
        startError instanceof Error
          ? startError.message
          : "Voice assistant could not start.",
      )
      updateStatus("error")
    } finally {
      busyRef.current = false
    }
  }, [
    connectSocket,
    releaseMedia,
    stopMicrophoneGraph,
    updateError,
    updateStatus,
  ])

  const disconnect = useCallback(() => {
    cleanupResources()
    if (mountedRef.current) {
      setMuted(false)
      setError("")
      setStatus("idle")
    }
  }, [cleanupResources])

  const stopAudio = useCallback(() => {
    suppressPlaybackRef.current = true
    stopPlayback()
    if (socketRef.current?.readyState === WebSocket.OPEN)
      updateStatus("listening")
  }, [stopPlayback, updateStatus])

  const toggleMute = useCallback(() => {
    const nextMuted = !muted
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })
    setMuted(nextMuted)
  }, [muted])

  const clearTranscript = useCallback(() => setTurns([]), [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cleanupResources()
    }
  }, [cleanupResources])

  return {
    status,
    error,
    muted,
    turns,
    start,
    disconnect,
    toggleMute,
    stopAudio,
    clearTranscript,
  }
}
