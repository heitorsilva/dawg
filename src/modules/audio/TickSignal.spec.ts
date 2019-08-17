import { expect } from '@/modules/audio/test';
import { TickSignal } from '@/modules/audio/TickSignal';

describe('TickSignal', () => {
  it('can be created with options', () => {
    const signal = new TickSignal({ frequency: 1 });
    expect(signal.value).to.eq(1);
  });

  it('can schedule a change in the future', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.setValueAtTime({ value: 2, time: 0.2 });
    tickSignal.dispose();
  });

  it('can schedule a ramp in the future', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.setValueAtTime({ value: 2, time: 0});
    tickSignal.linearRampToValueAtTime({ value: 0.1, endTime: 0.2 });
    tickSignal.exponentialRampToValueAtTime(1, 0.4);
    tickSignal.dispose();
  });

  it('calculates the ticks when no changes are scheduled', () => {
    const tickSignal0 = new TickSignal({ frequency: 2 });
    expect(tickSignal0.getTicksAtTime(1)).to.eq(2);
    expect(tickSignal0.getTicksAtTime(2)).to.eq(4);
    expect(tickSignal0.getTimeOfTick(4)).to.eq(2);
    tickSignal0.dispose();

    const tickSignal1 = new TickSignal({ frequency: 1 });
    expect(tickSignal1.getTicksAtTime(1)).to.eq(1);
    expect(tickSignal1.getTicksAtTime(2)).to.eq(2);
    expect(tickSignal1.getTimeOfTick(2)).to.eq(2);
    tickSignal1.dispose();
  });

  it('calculates the ticks in the future when a setValueAtTime is scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.setValueAtTime({ value: 2, time: 0.5 });
    expect(tickSignal.getTicksAtTime(0)).to.eq(0);
    expect(tickSignal.getTicksAtTime(0.5)).to.eq(0);
    expect(tickSignal.getTicksAtTime(0.75)).to.eq(1);
    expect(tickSignal.getTicksAtTime(1)).to.eq(1);
    expect(tickSignal.getTimeOfTick(1.5)).to.eq(1);
    tickSignal.dispose();
  });

  it('calculates the ticks in the future when multiple setValueAtTime are scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.setValueAtTime({ value: 2, time: 1 });
    tickSignal.setValueAtTime({ value: 4, time: 2 });
    expect(tickSignal.getTicksAtTime(0)).to.eq(0);
    expect(tickSignal.getTicksAtTime(0.5)).to.eq(0);
    expect(tickSignal.getTicksAtTime(1)).to.eq(1);
    expect(tickSignal.getTicksAtTime(1.5)).to.eq(2);
    expect(tickSignal.getTicksAtTime(2)).to.eq(3);
    expect(tickSignal.getTicksAtTime(2.5)).to.eq(5);
    expect(tickSignal.getTicksAtTime(3)).to.eq(7);
    expect(tickSignal.getTimeOfTick(7)).to.eq(3);
    tickSignal.dispose();
  });

  it('if ticks are 0, getTicksAtTime will return 0', () => {
    const tickSignal = new TickSignal({ frequency: 0 });
    tickSignal.setValueAtTime({ value: 0, time: 1 });
    tickSignal.linearRampToValueAtTime(0, 2);
    expect(tickSignal.getTicksAtTime(0)).to.equal(0);
    expect(tickSignal.getTicksAtTime(1)).to.equal(0);
    expect(tickSignal.getTicksAtTime(2)).to.equal(0);
    expect(tickSignal.getTicksAtTime(3)).to.equal(0);
    tickSignal.dispose();
  });

  it('calculates the ticks in the future when a linearRampToValueAtTime is scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.setValueAtTime({ value: 1, time: 0 });
    tickSignal.linearRampToValueAtTime(2, 1);
    expect(tickSignal.getTicksAtTime(0)).to.eq(0);
    expect(tickSignal.getTicksAtTime(0.5)).to.eq(0);
    expect(tickSignal.getTicksAtTime(1)).to.eq(1);
    expect(tickSignal.getTicksAtTime(2)).to.eq(3);
    tickSignal.dispose();
  });

  it('calculates the ticks in the future when multiple linearRampToValueAtTime are scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.setValueAtTime({ value: 1, time: 0 });
    tickSignal.linearRampToValueAtTime(2, 1);
    tickSignal.linearRampToValueAtTime(0, 2);
    expect(tickSignal.getTicksAtTime(0)).to.eq(0);
    expect(tickSignal.getTicksAtTime(0.5)).to.eq(0);
    expect(tickSignal.getTicksAtTime(1)).to.eq(1);
    expect(tickSignal.getTicksAtTime(2)).to.eq(2);
    expect(tickSignal.getTicksAtTime(3)).to.eq(2);
    tickSignal.dispose();
  });
});
