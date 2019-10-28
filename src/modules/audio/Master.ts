import { GraphNode } from '@/modules/audio/GraphNode';
import { Volume } from '@/modules/audio/Volume';

export class Master extends GraphNode {
  public volume = new Volume();
  constructor() {
    super({
      node,
    });
  }
}
