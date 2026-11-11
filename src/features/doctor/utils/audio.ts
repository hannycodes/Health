/**
 * Browser audio preparation for speech-to-text.
 *
 * Browsers record WebM/Opus or MP4 by default, but the speech model accepts
 * WAV (or MP3). This decodes the recording, downmixes to mono and resamples to
 * 16 kHz, then encodes a 16-bit PCM WAV entirely in the browser so no audio
 * conversion service is needed.
 */

const TARGET_SAMPLE_RATE = 16_000;

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const legacy = (window as Window & { webkitAudioContext?: AudioContextConstructor })
    .webkitAudioContext;
  return window.AudioContext ?? legacy;
}

function encodeWav(buffer: AudioBuffer): Blob {
  const channels = 1;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0);
  const dataSize = samples.length * 2;
  const view = new DataView(new ArrayBuffer(44 + dataSize));

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view.buffer], { type: "audio/wav" });
}

/** Convert any recorded audio blob into mono 16 kHz WAV. */
export async function toWavBlob(blob: Blob): Promise<Blob> {
  const Ctor = getAudioContextConstructor();
  if (!Ctor) throw new Error("Audio decoding is not available in this browser.");

  const context = new Ctor();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const frames = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));

    const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();

    const rendered = await offline.startRendering();
    return encodeWav(rendered);
  } finally {
    void context.close();
  }
}

/** Leave already-supported formats untouched, otherwise transcode to WAV. */
export async function prepareForTranscription(blob: Blob): Promise<Blob> {
  if (blob.type === "audio/wav" || blob.type === "audio/mpeg") return blob;
  return toWavBlob(blob);
}
