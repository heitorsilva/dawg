export type ContextTime = number;
export type TransportSeconds = number;
export type Ticks = number;
export type TransportTime = number | string;
export type Time = TransportTime;
export type TransportState = 'started' | 'stopped' | 'paused';
export type AutomationType =
  'linearRampToValueAtTime' |
  'exponentialRampToValueAtTime' |
  'setTargetAtTime' |
  'setValueAtTime' |
  'cancelScheduledValues';
