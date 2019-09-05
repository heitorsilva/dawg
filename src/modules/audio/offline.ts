import Tone from 'tone';
import { Context } from '@/modules/audio/Context';
import { ContextTime } from '@/modules/audio/types';

type Callback = (now: ContextTime) => void;

export const Offline = (
  callback: () => Callback | void,
  duration?: number,
  channels?: number,
): Promise<AudioBuffer> => {
  duration = duration || 0.1;
  channels = channels || 1;
  return (Tone as any).Offline(() => {
    const testFn = callback();
    if (typeof testFn === 'function') {
      Context.onDidTick(() => {
        testFn(Context.now());
      });
    }
  }, duration).then((buffer: AudioBuffer) => {
    // BufferTest(buffer);
    // if (channels === 1) {
    //   buffer.toMono();
    // }
    return buffer;
  });
};
