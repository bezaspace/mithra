class RakshaMicCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.streaming = false;
    this.port.onmessage = (event) => {
      const eventType = event.data?.type;
      if (eventType === "start") {
        this.streaming = true;
      } else if (eventType === "pause") {
        this.streaming = false;
      }
    };
  }

  process(inputs) {
    if (!this.streaming) {
      return true;
    }

    const channel = inputs?.[0]?.[0];
    if (!channel || channel.length === 0) {
      return true;
    }

    const samples = new Float32Array(channel.length);
    samples.set(channel);
    this.port.postMessage(samples, [samples.buffer]);
    return true;
  }
}

registerProcessor("raksha-mic-capture", RakshaMicCaptureProcessor);
