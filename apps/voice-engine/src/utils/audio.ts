/**
 * Audio Utilities
 * Handles audio format conversions for the voice pipeline
 * 
 * Twilio uses mu-law (mulaw) 8kHz mono
 * Deepgram accepts various formats but works best with linear PCM
 * ElevenLabs outputs PCM that needs conversion to mulaw for Twilio
 */

import { AudioConversionOptions, AudioFormat } from '../types';

// mu-law encoding table
const MULAW_ENCODE_TABLE: number[] = [
  0, 0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3,
  4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
  5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
  5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7
];

// mu-law decoding table
const MULAW_DECODE_TABLE: number[] = [
  0x8284, 0x8684, 0x8a84, 0x8e84, 0x9284, 0x9684, 0x9a84, 0x9e84,
  0xa284, 0xa684, 0xaa84, 0xae84, 0xb284, 0xb684, 0xba84, 0xbe84,
  0xc184, 0xc384, 0xc584, 0xc784, 0xc984, 0xcb84, 0xcd84, 0xcf84,
  0xd184, 0xd384, 0xd584, 0xd784, 0xd984, 0xdb84, 0xdd84, 0xdf84,
  0xe104, 0xe204, 0xe304, 0xe404, 0xe504, 0xe604, 0xe704, 0xe804,
  0xe904, 0xea04, 0xeb04, 0xec04, 0xed04, 0xee04, 0xef04, 0xf004,
  0xf0c4, 0xf144, 0xf1c4, 0xf244, 0xf2c4, 0xf344, 0xf3c4, 0xf444,
  0xf4c4, 0xf544, 0xf5c4, 0xf644, 0xf6c4, 0xf744, 0xf7c4, 0xf844,
  0xf8a4, 0xf8e4, 0xf924, 0xf964, 0xf9a4, 0xf9e4, 0xfa24, 0xfa64,
  0xfaa4, 0xfae4, 0xfb24, 0xfb64, 0xfba4, 0xfbe4, 0xfc24, 0xfc64,
  0xfc94, 0xfcb4, 0xfcd4, 0xfcf4, 0xfd14, 0xfd34, 0xfd54, 0xfd74,
  0xfd94, 0xfdb4, 0xfdd4, 0xfdf4, 0xfe14, 0xfe34, 0xfe54, 0xfe74,
  0xfe94, 0xfea4, 0xfeb4, 0xfec4, 0xfed4, 0xfee4, 0xfef4, 0xff04,
  0xff14, 0xff24, 0xff34, 0xff44, 0xff54, 0xff64, 0xff74, 0xff84,
  0xff94, 0xffa4, 0xffb4, 0xffc4, 0xffd4, 0xffe4, 0xfff4, 0x0004,
  0x7f7c, 0x7b7c, 0x777c, 0x737c, 0x6f7c, 0x6b7c, 0x677c, 0x637c,
  0x5f7c, 0x5b7c, 0x577c, 0x537c, 0x4f7c, 0x4b7c, 0x477c, 0x437c,
  0x407c, 0x3e7c, 0x3c7c, 0x3a7c, 0x387c, 0x367c, 0x347c, 0x327c,
  0x307c, 0x2e7c, 0x2c7c, 0x2a7c, 0x287c, 0x267c, 0x247c, 0x227c,
  0x20fc, 0x1ffc, 0x1efc, 0x1dfc, 0x1cfc, 0x1bfc, 0x1afc, 0x19fc,
  0x18fc, 0x17fc, 0x16fc, 0x15fc, 0x14fc, 0x13fc, 0x12fc, 0x11fc,
  0x113c, 0x10bc, 0x103c, 0x0fbc, 0x0f3c, 0x0ebc, 0x0e3c, 0x0dbc,
  0x0d3c, 0x0cbc, 0x0c3c, 0x0bbc, 0x0b3c, 0x0abc, 0x0a3c, 0x09bc,
  0x095c, 0x091c, 0x08dc, 0x089c, 0x085c, 0x081c, 0x07dc, 0x079c,
  0x075c, 0x071c, 0x06dc, 0x069c, 0x065c, 0x061c, 0x05dc, 0x059c,
  0x056c, 0x054c, 0x052c, 0x050c, 0x04ec, 0x04cc, 0x04ac, 0x048c,
  0x046c, 0x044c, 0x042c, 0x040c, 0x03ec, 0x03cc, 0x03ac, 0x038c,
  0x036c, 0x035c, 0x034c, 0x033c, 0x032c, 0x031c, 0x030c, 0x02fc,
  0x02ec, 0x02dc, 0x02cc, 0x02bc, 0x02ac, 0x029c, 0x028c, 0x027c,
  0x026c, 0x025c, 0x024c, 0x023c, 0x022c, 0x021c, 0x020c, 0x01fc,
  0x01ec, 0x01dc, 0x01cc, 0x01bc, 0x01ac, 0x019c, 0x018c, 0x017c,
  0x016c, 0x015c, 0x014c, 0x013c, 0x012c, 0x011c, 0x010c, 0x00fc
];

// Bias for mu-law
const MULAW_BIAS = 0x84;

/**
 * Convert mu-law to linear PCM (16-bit signed)
 * @param mulawBuffer Buffer containing mu-law encoded audio
 * @returns Buffer containing 16-bit signed PCM audio
 */
export function mulawToPcm(mulawBuffer: Buffer): Buffer {
  const pcmBuffer = Buffer.alloc(mulawBuffer.length * 2);
  
  for (let i = 0; i < mulawBuffer.length; i++) {
    const mulawByte = mulawBuffer[i];
    const pcmSample = MULAW_DECODE_TABLE[mulawByte];
    pcmBuffer.writeInt16LE(pcmSample, i * 2);
  }
  
  return pcmBuffer;
}

/**
 * Convert linear PCM (16-bit signed) to mu-law
 * @param pcmBuffer Buffer containing 16-bit signed PCM audio
 * @returns Buffer containing mu-law encoded audio
 */
export function pcmToMulaw(pcmBuffer: Buffer): Buffer {
  const mulawBuffer = Buffer.alloc(pcmBuffer.length / 2);
  
  for (let i = 0; i < mulawBuffer.length; i++) {
    const pcmSample = pcmBuffer.readInt16LE(i * 2);
    mulawBuffer[i] = linearToMulaw(pcmSample);
  }
  
  return mulawBuffer;
}

/**
 * Convert a single linear sample to mu-law
 * @param sample 16-bit signed linear sample
 * @returns mu-law encoded byte
 */
function linearToMulaw(sample: number): number {
  let mask: number;
  
  if (sample < 0) {
    sample = MULAW_BIAS - sample;
    mask = 0x7f;
  } else {
    sample = MULAW_BIAS + sample;
    mask = 0xff;
  }
  
  let seg = MULAW_ENCODE_TABLE[(sample >> 8) & 0x7f];
  
  if (seg >= 8) {
    return (0x7f ^ mask) as number;
  }
  
  const uval = (seg << 4) | ((sample >> (seg + 3)) & 0xf);
  return (uval ^ mask) as number;
}

/**
 * Convert base64 mu-law audio to PCM
 * @param base64Audio Base64 encoded mu-law audio
 * @returns Buffer containing 16-bit signed PCM audio
 */
export function base64MulawToPcm(base64Audio: string): Buffer {
  const mulawBuffer = Buffer.from(base64Audio, 'base64');
  return mulawToPcm(mulawBuffer);
}

/**
 * Convert PCM audio to base64 mu-law
 * @param pcmBuffer Buffer containing 16-bit signed PCM audio
 * @returns Base64 encoded mu-law audio string
 */
export function pcmToBase64Mulaw(pcmBuffer: Buffer): string {
  const mulawBuffer = pcmToMulaw(pcmBuffer);
  return mulawBuffer.toString('base64');
}

/**
 * Resample audio from one sample rate to another
 * Simple linear interpolation for resampling
 * @param inputBuffer Input audio buffer (16-bit PCM)
 * @param inputRate Input sample rate
 * @param outputRate Output sample rate
 * @returns Resampled audio buffer
 */
export function resamplePcm(
  inputBuffer: Buffer,
  inputRate: number,
  outputRate: number
): Buffer {
  if (inputRate === outputRate) {
    return inputBuffer;
  }
  
  const inputSamples = inputBuffer.length / 2; // 16-bit samples
  const outputSamples = Math.floor(inputSamples * (outputRate / inputRate));
  const outputBuffer = Buffer.alloc(outputSamples * 2);
  
  const ratio = inputSamples / outputSamples;
  
  for (let i = 0; i < outputSamples; i++) {
    const inputIndex = i * ratio;
    const index1 = Math.floor(inputIndex);
    const index2 = Math.min(index1 + 1, inputSamples - 1);
    const fraction = inputIndex - index1;
    
    const sample1 = inputBuffer.readInt16LE(index1 * 2);
    const sample2 = inputBuffer.readInt16LE(index2 * 2);
    
    const interpolated = sample1 + (sample2 - sample1) * fraction;
    outputBuffer.writeInt16LE(Math.round(interpolated), i * 2);
  }
  
  return outputBuffer;
}

/**
 * Convert mono audio to stereo
 * @param monoBuffer Mono audio buffer (16-bit PCM)
 * @returns Stereo audio buffer
 */
export function monoToStereo(monoBuffer: Buffer): Buffer {
  const stereoBuffer = Buffer.alloc(monoBuffer.length * 2);
  
  for (let i = 0; i < monoBuffer.length / 2; i++) {
    const sample = monoBuffer.readInt16LE(i * 2);
    stereoBuffer.writeInt16LE(sample, i * 4);     // Left channel
    stereoBuffer.writeInt16LE(sample, i * 4 + 2); // Right channel
  }
  
  return stereoBuffer;
}

/**
 * Convert stereo audio to mono by averaging channels
 * @param stereoBuffer Stereo audio buffer (16-bit PCM)
 * @returns Mono audio buffer
 */
export function stereoToMono(stereoBuffer: Buffer): Buffer {
  const monoBuffer = Buffer.alloc(stereoBuffer.length / 2);
  
  for (let i = 0; i < monoBuffer.length / 2; i++) {
    const left = stereoBuffer.readInt16LE(i * 4);
    const right = stereoBuffer.readInt16LE(i * 4 + 2);
    const mono = Math.round((left + right) / 2);
    monoBuffer.writeInt16LE(mono, i * 2);
  }
  
  return monoBuffer;
}

/**
 * Apply gain to audio buffer
 * @param buffer Audio buffer (16-bit PCM)
 * @param gain Gain factor (1.0 = no change)
 * @returns Audio buffer with applied gain
 */
export function applyGain(buffer: Buffer, gain: number): Buffer {
  const result = Buffer.alloc(buffer.length);
  
  for (let i = 0; i < buffer.length / 2; i++) {
    const sample = buffer.readInt16LE(i * 2);
    const amplified = Math.max(-32768, Math.min(32767, Math.round(sample * gain)));
    result.writeInt16LE(amplified, i * 2);
  }
  
  return result;
}

/**
 * Calculate RMS (Root Mean Square) level of audio buffer
 * Used for voice activity detection
 * @param buffer Audio buffer (16-bit PCM)
 * @returns RMS level (0-32767)
 */
export function calculateRms(buffer: Buffer): number {
  let sum = 0;
  
  for (let i = 0; i < buffer.length / 2; i++) {
    const sample = buffer.readInt16LE(i * 2);
    sum += sample * sample;
  }
  
  return Math.sqrt(sum / (buffer.length / 2));
}

/**
 * Detect if audio buffer contains voice activity
 * @param buffer Audio buffer (16-bit PCM)
 * @param threshold RMS threshold for voice detection (default: 500)
 * @returns True if voice activity detected
 */
export function detectVoiceActivity(buffer: Buffer, threshold: number = 500): boolean {
  const rms = calculateRms(buffer);
  return rms > threshold;
}

/**
 * Create a silent audio buffer
 * @param durationMs Duration in milliseconds
 * @param sampleRate Sample rate in Hz
 * @returns Buffer of silence (16-bit PCM)
 */
export function createSilence(durationMs: number, sampleRate: number = 8000): Buffer {
  const numSamples = Math.floor((durationMs * sampleRate) / 1000);
  return Buffer.alloc(numSamples * 2); // 16-bit samples
}

/**
 * Chunk audio buffer into smaller pieces
 * @param buffer Audio buffer
 * @param chunkSize Target chunk size in bytes
 * @returns Array of audio chunks
 */
export function chunkAudio(buffer: Buffer, chunkSize: number): Buffer[] {
  const chunks: Buffer[] = [];
  
  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(buffer.slice(i, Math.min(i + chunkSize, buffer.length)));
  }
  
  return chunks;
}

/**
 * Audio buffer class for managing streaming audio
 */
export class AudioBuffer {
  private buffer: Buffer = Buffer.alloc(0);
  private readonly sampleRate: number;
  private readonly channels: number;
  
  constructor(sampleRate: number = 8000, channels: number = 1) {
    this.sampleRate = sampleRate;
    this.channels = channels;
  }
  
  /**
   * Append audio data to buffer
   */
  append(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data]);
  }
  
  /**
   * Read and remove audio data from buffer
   * @param size Number of bytes to read
   * @returns Audio data or null if not enough data
   */
  read(size: number): Buffer | null {
    if (this.buffer.length < size) {
      return null;
    }
    
    const data = this.buffer.slice(0, size);
    this.buffer = this.buffer.slice(size);
    return data;
  }
  
  /**
   * Peek at audio data without removing
   */
  peek(size: number): Buffer | null {
    if (this.buffer.length < size) {
      return null;
    }
    return this.buffer.slice(0, size);
  }
  
  /**
   * Get buffer length in bytes
   */
  get length(): number {
    return this.buffer.length;
  }
  
  /**
   * Get buffer length in milliseconds
   */
  get durationMs(): number {
    const bytesPerSample = 2; // 16-bit
    const samples = this.buffer.length / (bytesPerSample * this.channels);
    return (samples / this.sampleRate) * 1000;
  }
  
  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = Buffer.alloc(0);
  }
  
  /**
   * Get raw buffer
   */
  getBuffer(): Buffer {
    return this.buffer;
  }
}

/**
 * Audio format information for Twilio
 */
export const TWILIO_AUDIO_FORMAT: AudioFormat = {
  encoding: 'mulaw',
  sampleRate: 8000,
  channels: 1
};

/**
 * Audio format information for Deepgram
 */
export const DEEPGRAM_AUDIO_FORMAT: AudioFormat = {
  encoding: 'linear16',
  sampleRate: 8000,
  channels: 1
};

/**
 * Default frame size for audio processing (20ms at 8kHz)
 */
export const DEFAULT_FRAME_SIZE = 160; // 20ms * 8000Hz / 1000 * 1 channel

/**
 * Convert audio from Twilio format to Deepgram format
 * @param twilioAudio Base64 encoded mu-law audio from Twilio
 * @returns Buffer containing 16-bit PCM audio for Deepgram
 */
export function twilioToDeepgram(twilioAudio: string): Buffer {
  return base64MulawToPcm(twilioAudio);
}

/**
 * Convert audio from Deepgram/ElevenLabs format to Twilio format
 * @param pcmBuffer 16-bit PCM audio buffer
 * @returns Base64 encoded mu-law audio for Twilio
 */
export function deepgramToTwilio(pcmBuffer: Buffer): string {
  return pcmToBase64Mulaw(pcmBuffer);
}

/**
 * Audio pipeline configuration
 */
export interface AudioPipelineConfig {
  inputFormat: AudioFormat;
  outputFormat: AudioFormat;
  frameSize: number;
  bufferSize: number;
}

/**
 * Default audio pipeline configuration
 */
export const DEFAULT_PIPELINE_CONFIG: AudioPipelineConfig = {
  inputFormat: TWILIO_AUDIO_FORMAT,
  outputFormat: TWILIO_AUDIO_FORMAT,
  frameSize: DEFAULT_FRAME_SIZE,
  bufferSize: DEFAULT_FRAME_SIZE * 10 // 200ms buffer
};
