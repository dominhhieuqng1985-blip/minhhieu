export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private nextPlayTime: number = 0;
  private playbackQueue: AudioBufferSourceNode[] = [];
  private onSpeakingChange?: (isSpeaking: boolean) => void;

  constructor(onSpeakingChange?: (isSpeaking: boolean) => void) {
    this.onSpeakingChange = onSpeakingChange;
  }

  async startRecording(onAudioData: (base64Data: string) => void) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Trình duyệt của bạn hông hỗ trợ dùng micro rồi. Bạn thử dùng trình duyệt khác nha!");
    }
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error("Hông tìm thấy micro rồi! Bạn kiểm tra lại micro đã cắm chưa hoặc có bị chặn hông nha.");
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error("Bé Na hông nghe được vì bạn chưa cho phép dùng micro nè. Bạn nhấn 'Cho phép' trên trình duyệt nha!");
      } else {
        throw new Error("Lỗi micro: " + err.message);
      }
    }
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    
    this.processor.onaudioprocess = (e) => {
      const channelData = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        let s = Math.max(-1, Math.min(1, channelData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      const buffer = new ArrayBuffer(pcm16.length * 2);
      const view = new DataView(buffer);
      for (let i = 0; i < pcm16.length; i++) {
        view.setInt16(i * 2, pcm16[i], true);
      }
      
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      onAudioData(base64);
    };
  }

  playAudioChunk(base64Audio: string) {
    if (!this.audioContext) return;
    
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const pcm16 = new Int16Array(bytes.buffer);
    const audioBuffer = this.audioContext.createBuffer(1, pcm16.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcm16.length; i++) {
      channelData[i] = pcm16[i] / 32768.0;
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    
    const currentTime = this.audioContext.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime;
    }
    
    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
    this.playbackQueue.push(source);
    
    if (this.playbackQueue.length === 1 && this.onSpeakingChange) {
      this.onSpeakingChange(true);
    }
    
    source.onended = () => {
      this.playbackQueue = this.playbackQueue.filter(s => s !== source);
      if (this.playbackQueue.length === 0 && this.onSpeakingChange) {
        this.onSpeakingChange(false);
      }
    };
  }

  stopPlayback() {
    this.playbackQueue.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    this.playbackQueue = [];
    if (this.onSpeakingChange) {
      this.onSpeakingChange(false);
    }
    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
  }

  stopRecording() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.playbackQueue = [];
    this.nextPlayTime = 0;
  }
}
