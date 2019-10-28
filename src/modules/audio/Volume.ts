import { GraphNode } from '@/modules/audio/GraphNode';
import { mergeObjects } from '@/modules/audio/utils';
import { Gain } from '@/modules/audio/Gain';

interface VolumeOptions {
  volume: number;
  mute: false;
}

export class Volume extends GraphNode {
  constructor(opts?: Partial<VolumeOptions>) {
    const options: VolumeOptions = mergeObjects(opts, { volume: 0, mute: false });
    const node = new Gain({ value: options.volume });
    super({
      node,
    });
  }
}
