interface WavBuffer {
  channelData: number[][],
  sampleRate: number,
}

declare module 'node-wav' {
  function decode(buffer: Buffer): WavBuffer;
  function encode(channelData: Float32Array[], opts: { sampleRate: number, float: boolean, bitDepth: number }): Buffer;
}