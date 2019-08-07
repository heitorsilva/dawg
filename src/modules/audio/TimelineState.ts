import Tone from 'tone';
import { TransportState, TransportTime, Time } from '@/modules/audio/types';
import { Timeline } from '@/modules/audio/Timeline';
import { Context } from '@/modules/audio';

/**
 *  @class  A Timeline State. Provides the methods: <code>setStateAtTime("state", time)</code>
 *          and <code>getValueAtTime(time)</code>.
 *
 *  @extends {Tone.Timeline}
 *  @param {String} initial The initial state of the TimelineState.
 *                          Defaults to <code>undefined</code>
 */
export class TimelineState<T extends { state: TransportState, time: number }> extends Timeline<T> {
  constructor(private initial: TransportState) {
    super();
  }

  /**
   *  Returns the scheduled state scheduled before or at
   *  the given time.
   *  @param  {Number}  time  The time to query.
   *  @return  {String}  The name of the state input in setStateAtTime.
   */
  public getValueAtTime(time: TransportTime) {
    const event = this.get(time);
    if (event !== null) {
      return event.state;
    } else {
      return this.initial;
    }
  }

  /**
   *  Add a state to the timeline.
   *  @param  {String}  state The name of the state to set.
   *  @param  {Number}  time  The time to query.
   *  @returns {Tone.TimelineState} this
   */
  public setStateAtTime(event: T) {
    // all state changes need to be >= the previous state time
    // TODO throw error if time < the previous event time
    this.add(event);
    return this;
  }

  /**
   *  Return the event before the time with the given state
   *  @param state The state to look for
   *  @param time  When to check before
   *  @return The event with the given state before the time
   */
  public getLastState(state: TransportState, time: Time) {
    time = Context.toSeconds(time);
    const index = this.search(time);
    for (let i = index; i >= 0; i--) {
      const event = this.timeline[i];
      if (event.state === state) {
        return event;
      }
    }
  }
}





export default Tone.TimelineState;
