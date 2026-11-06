const OUTPUT_SAMPLE_RATE = 16000
const OUTPUT_CHUNK_SAMPLES = 1600

class ShramPcmCapture extends AudioWorkletProcessor {
  constructor() {
    super()
    this.pending = []
    this.resampleBuffer = []
    this.phase = 0
  }

  process(inputs) {
    const channel = inputs[0]?.[0]
    if (!channel) return true

    const ratio = sampleRate / OUTPUT_SAMPLE_RATE
    for (const sample of channel) this.resampleBuffer.push(sample)

    while (this.resampleBuffer.length >= Math.ceil(this.phase + ratio)) {
      const start = this.phase
      const end = start + ratio
      let sum = 0
      let covered = 0
      for (let index = Math.floor(start); index < Math.ceil(end); index += 1) {
        const overlap = Math.max(
          0,
          Math.min(end, index + 1) - Math.max(start, index),
        )
        sum += (this.resampleBuffer[index] || 0) * overlap
        covered += overlap
      }
      this.pending.push(sum / Math.max(1, covered))
      this.phase = end
    }

    const consumed = Math.floor(this.phase)
    if (consumed > 0) {
      this.resampleBuffer.splice(0, consumed)
      this.phase -= consumed
    }

    while (this.pending.length >= OUTPUT_CHUNK_SAMPLES) {
      const buffer = new ArrayBuffer(OUTPUT_CHUNK_SAMPLES * 2)
      const view = new DataView(buffer)
      for (let index = 0; index < OUTPUT_CHUNK_SAMPLES; index += 1) {
        const sample = Math.max(-1, Math.min(1, this.pending[index]))
        const pcm = sample < 0 ? sample * 32768 : sample * 32767
        view.setInt16(index * 2, pcm, true)
      }
      this.pending.splice(0, OUTPUT_CHUNK_SAMPLES)
      this.port.postMessage(buffer, [buffer])
    }

    return true
  }
}

registerProcessor("shram-pcm-capture", ShramPcmCapture)
