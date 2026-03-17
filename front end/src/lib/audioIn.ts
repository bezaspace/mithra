export type AudioInputController = {
  startStream: () => void;
  pauseStream: () => void;
  stop: () => void;
  isStreaming: () => boolean;
};

const WORKLET_MODULE_PATH = new URL("./worklets/micCaptureProcessor.js", import.meta.url);
const TARGET_SAMPLE_RATE = 16000;
const TARGET_CHUNK_SAMPLES = 800; // 50ms at 16kHz

const downsampleToPcm16 = (input: Float32Array, sourceSampleRate: number, targetSampleRate: number): Int16Array => {
  if (input.length === 0) return new Int16Array(0);

  const safeSourceRate = sourceSampleRate > 0 ? sourceSampleRate : targetSampleRate;
  const ratio = safeSourceRate / targetSampleRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i += 1) {
    const position = i * ratio;
    const leftIndex = Math.min(Math.floor(position), input.length - 1);
    const rightIndex = Math.min(leftIndex + 1, input.length - 1);
    const fraction = position - leftIndex;
    const interpolated = input[leftIndex] * (1 - fraction) + input[rightIndex] * fraction;
    const sample = Math.max(-1, Math.min(1, interpolated));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output;
};

export async function startMicCapture(onChunk: (chunk: ArrayBuffer) => void): Promise<AudioInputController> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const audioCtx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  await audioCtx.audioWorklet.addModule(WORKLET_MODULE_PATH);

  const source = audioCtx.createMediaStreamSource(stream);
  const workletNode = new AudioWorkletNode(audioCtx, "raksha-mic-capture", {
    numberOfInputs: 1,
    numberOfOutputs: 0,
    channelCount: 1,
  });

  source.connect(workletNode);

  let streaming = false;
  let pending = new Int16Array(0);
  let delayedFlushTimer: number | null = null;

  const appendAndEmit = (incoming: Int16Array) => {
    if (incoming.length === 0) return;
    const merged = new Int16Array(pending.length + incoming.length);
    merged.set(pending);
    merged.set(incoming, pending.length);
    pending = merged;

    while (pending.length >= TARGET_CHUNK_SAMPLES) {
      const frame = pending.slice(0, TARGET_CHUNK_SAMPLES);
      onChunk(frame.buffer);
      pending = pending.slice(TARGET_CHUNK_SAMPLES);
    }
  };

  const flushPending = () => {
    if (pending.length === 0) return;
    const tail = pending.slice();
    pending = new Int16Array(0);
    onChunk(tail.buffer);
  };

  workletNode.port.onmessage = (evt: MessageEvent<Float32Array | ArrayBuffer>) => {
    if (!streaming) return;
    if (evt.data instanceof Float32Array) {
      appendAndEmit(downsampleToPcm16(evt.data, audioCtx.sampleRate, TARGET_SAMPLE_RATE));
      return;
    }
    if (evt.data instanceof ArrayBuffer) {
      appendAndEmit(downsampleToPcm16(new Float32Array(evt.data), audioCtx.sampleRate, TARGET_SAMPLE_RATE));
    }
  };

  const startStream = () => {
    if (streaming) return;
    if (delayedFlushTimer !== null) {
      window.clearTimeout(delayedFlushTimer);
      delayedFlushTimer = null;
    }
    streaming = true;
    void audioCtx.resume();
    workletNode.port.postMessage({ type: "start" });
  };

  const pauseStream = () => {
    if (!streaming) return;
    streaming = false;
    workletNode.port.postMessage({ type: "pause" });
    flushPending();
    delayedFlushTimer = window.setTimeout(() => {
      flushPending();
      delayedFlushTimer = null;
    }, 24);
  };

  return {
    startStream,
    pauseStream,
    isStreaming: () => streaming,
    stop: () => {
      pauseStream();
      if (delayedFlushTimer !== null) {
        window.clearTimeout(delayedFlushTimer);
        delayedFlushTimer = null;
      }
      workletNode.disconnect();
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      void audioCtx.close();
    },
  };
}
