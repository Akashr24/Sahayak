/**
 * audioRecorder.js — Browser Audio Recorder with PCM 16-bit 16kHz Mono WAV Encoder
 * Captures clean microphone audio compatible directly with Python's speech_recognition library.
 */

export class WAVAwbRecorder {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.input = null;
    this.recordedBuffers = [];
    this.recordingLength = 0;
    this.targetSampleRate = 16000;
    this.isRecording = false;
  }

  async start() {
    this.recordedBuffers = [];
    this.recordingLength = 0;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: this.targetSampleRate });
    
    // In case the browser forces 44.1k or 48k sample rate on hardware:
    this.actualSampleRate = this.audioContext.sampleRate;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    this.input = this.audioContext.createMediaStreamSource(this.mediaStream);
    // Use ScriptProcessor for maximum cross-browser compatibility
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputData = e.inputBuffer.getChannelData(0);
      this.recordedBuffers.push(new Float32Array(inputData));
      this.recordingLength += inputData.length;
    };

    this.input.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    this.isRecording = true;
  }

  async stop() {
    this.isRecording = false;

    if (this.processor && this.input) {
      this.input.disconnect();
      this.processor.disconnect();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }

    // Merge Float32 buffers
    const merged = new Float32Array(this.recordingLength);
    let offset = 0;
    for (const buffer of this.recordedBuffers) {
      merged.set(buffer, offset);
      offset += buffer.length;
    }

    // Resample to 16000 Hz if needed
    let samples = merged;
    let sampleRate = this.actualSampleRate || this.targetSampleRate;
    if (sampleRate !== this.targetSampleRate) {
      samples = this._resample(merged, sampleRate, this.targetSampleRate);
      sampleRate = this.targetSampleRate;
    }

    // Encode to 16-bit PCM WAV Blob
    return this._encodeWAV(samples, sampleRate);
  }

  _resample(source, fromRate, toRate) {
    const ratio = fromRate / toRate;
    const newLength = Math.round(source.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = Math.min(Math.round(i * ratio), source.length - 1);
      result[i] = source[srcIndex];
    }
    return result;
  }

  _encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    this._writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    this._writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    this._writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true);  // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    view.setUint16(32, 2, true);  // BlockAlign (NumChannels * BitsPerSample/8)
    view.setUint16(34, 16, true); // BitsPerSample (16 bits)

    // data sub-chunk
    this._writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // PCM 16-bit samples
    let index = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      index += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  _writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
