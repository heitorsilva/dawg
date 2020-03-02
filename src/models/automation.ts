import * as t from '@/lib/io';
import { PointType, IPoint, Point } from '@/models/automation/point';
import uuid from 'uuid';
import * as Audio from '@/lib/audio';
import { Serializable } from '@/models/serializable';
import { Channel } from '@/models/channel';
import { Instrument } from '@/models/instrument/instrument';
import { Beats } from '@/models/types';
import { BuildingBlock } from '@/models/block';
import * as oly from '@/olyger';

export const AutomationType = t.type({
  context: t.union([t.literal('channel'), t.literal('instrument')]),
  contextId: t.string,
  attr: t.string,
  id: t.string,
  name: t.string,
  points: t.array(PointType),
});

export type IAutomation = t.TypeOf<typeof AutomationType>;

export type ClipContext = IAutomation['context'];
export type Automatable = Channel | Instrument<any, any>;

export class AutomationClip implements Serializable<IAutomation>, BuildingBlock {
  public static create(length: number, signal: Audio.Signal, context: ClipContext, id: string, attr: string) {
    const ac = new AutomationClip(signal, {
      id: uuid.v4(),
      context,
      contextId: id,
      points: [
        {
          time: 0,
          value: signal.value,
        },
        {
          time: length,
          value: signal.value,
        },
      ],
      attr,
      name: 'Automation',
    });

    return ac;
  }

  // FIXME not undo/redo ready
  public points: Point[] = [];
  public context: ClipContext;
  public contextId: string;
  public attr: string;
  public id: string;
  public readonly name: oly.OlyRef<string>;

  public control: Audio.Controller;
  private signal: Audio.Signal;

  constructor(signal: Audio.Signal, i: IAutomation) {
    this.context = i.context;
    this.contextId = i.contextId;
    this.attr = i.attr;
    this.id = i.id;
    this.name = oly.olyRef(i.name);

    this.signal = signal;
    this.control = new Audio.Controller(signal);

    this.points = i.points.map((point) => {
      return this.schedule(point);
    });
  }

  get duration() {
    if (!this.points.length) {
      return 0;
    }

    return this.points[this.points.length - 1].time;
  }

  get minValue() {
    return this.signal.minValue;
  }

  get maxValue() {
    return this.signal.maxValue;
  }

  public setValue(index: number, value: number) {
    const point = this.points[index];
    this.control.change(point.eventId, value);
    this.points[index].value = value;
  }

  public setTime(index: number, time: Beats) {
    const point = this.points[index];
    this.control.setTime(point.eventId, time);
    this.points[index].time = time;
  }

  public remove(i: number) {
    const point = this.points[i];
    this.control.remove(point.eventId);
    this.points.splice(i, 1);
  }

  public add(time: Beats, value: number) {
    this.points.push(this.schedule({ time, value }));
  }

  public serialize() {
    return {
      context: this.context,
      contextId: this.contextId,
      attr: this.attr,
      id: this.id,
      name: this.name.value,
      points: this.points.map((point) => point.serialize()),
    };
  }

  public dispose() {
    this.control.dispose();
  }

  private schedule(iPoint: IPoint) {
    const eventId = this.control.add(iPoint.time, iPoint.value);
    const point = new Point(iPoint, eventId);
    return point;
  }
}
