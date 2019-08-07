import Tone from 'tone';
import { computed } from 'vue-function-api';
import { TransportTime } from '@/modules/audio';
import { ContextTime } from '@/modules/audio/types';

/**
 *  @class A Timeline class for scheduling and maintaining state
 *         along a timeline. All events must have a "time" property.
 *         Internally, events are stored in time order for fast
 *         retrieval.
 *  @param {Positive} [memory=Infinity] The number of previous events that are retained.
 */
export class Timeline<T extends { time: Tone.Time | number }> {
  protected timeline: T[] = [];
  private length = computed(() => this.timeline.length);

  // FIXME
  private memory = Infinity;

  public add(event: T) {
    event.time = event.time.valueOf();
    const index = this.search(event.time);
    this.timeline.splice(index + 1, 0, event);
    // if the length is more than the memory, remove the previous ones
    if (this.length.value > this.memory) {
      const diff = this.length.value - this.memory;
      this.timeline.splice(0, diff);
    }
    return this;
  }

  /**
   *  Get the nearest event whose time is less than or equal to the given time.
   *  @param  {Number}  time  The time to query.
   *  @param  {String}  comparator Which value in the object to compare
   *  @returns {Object} The event object set after that time.
   */
  public get(time: TransportTime, comparator: 'time' = 'time') {
    const index = this.search(time, comparator);
    if (index !== -1) {
      return this.timeline[index];
    } else {
      return null;
    }
  }

  public cancel(after: ContextTime) {
    if (this.timeline.length > 1) {
      let index = this.search(after);
      if (index >= 0) {
        if (this.timeline[index].time === after) {
          // get the first item with that time
          for (let i = index; i >= 0; i--) {
            if (this.timeline[i].time === after) {
              index = i;
            } else {
              break;
            }
          }
          this.timeline = this.timeline.slice(0, index);
        } else {
          this.timeline = this.timeline.slice(0, index + 1);
        }
      } else {
        this.timeline = [];
      }
    } else if (this.timeline.length === 1) {
      // the first item's time
      if (this.timeline[0].time >= after) {
        this.timeline = [];
      }
    }
    return this;
  }

  /**
   *  Remove an event from the timeline.
   *  @param  event The event object to remove from the list.
   *  @returns this
   */
  public remove(event: T) {
    const index = this.timeline.indexOf(event);
    if (index !== -1) {
      this.timeline.splice(index, 1);
    }
    return this;
  }

  public forEachBetween(startTime: ContextTime, endTime: ContextTime, callback: (event: T) => void) {
    let lowerBound = this.search(startTime);
    let upperBound = this.search(endTime);
    if (lowerBound !== -1 && upperBound !== -1) {
      if (this.timeline[lowerBound].time !== startTime) {
        lowerBound += 1;
      }
      // exclusive of the end time
      if (this.timeline[upperBound].time === endTime) {
        upperBound -= 1;
      }
      this.iterate(callback, lowerBound, upperBound);
    } else if (lowerBound === -1) {
      this.iterate(callback, 0, upperBound);
    }
    return this;
  }

  /**
   *  Does a binary search on the timeline array and returns the
   *  nearest event index whose time is after or equal to the given time.
   *  If a time is searched before the first index in the timeline, -1 is returned.
   *  If the time is after the end, the index of the last item is returned.
   *  @param  {Number}  time
   *  @param  {String}  comparator Which value in the object to compare
   *  @return  {Number} the index in the timeline array
   *  @private
   */
  protected search(time: TransportTime, comparator: 'time' = 'time') {
    if (this.timeline.length === 0) {
      return -1;
    }

    let beginning = 0;
    const len = this.timeline.length;
    let end = len;
    if (len > 0 && this.timeline[len - 1][comparator] <= time) {
      return len - 1;
    }
    while (beginning < end) {
      // calculate the midpoint for roughly equal partition
      let midPoint = Math.floor(beginning + (end - beginning) / 2);
      const event = this.timeline[midPoint];
      const nextEvent = this.timeline[midPoint + 1];
      if (event[comparator] === time) {
        // choose the last one that has the same time
        for (let i = midPoint; i < this.timeline.length; i++) {
          const testEvent = this.timeline[i];
          if (testEvent[comparator] === time) {
            midPoint = i;
          }
        }
        return midPoint;
      } else if (event[comparator] < time && nextEvent[comparator] > time) {
        return midPoint;
      } else if (event[comparator] > time) {
        // search lower
        end = midPoint;
      } else {
        // search upper
        beginning = midPoint + 1;
      }
    }
    return -1;
  }

  private iterate(callback: (event: T) => void, lowerBound = 0, upperBound = this.timeline.length - 1) {
    this.timeline.slice(lowerBound, upperBound + 1).forEach((event) => {
      callback.call(this, event);
    });
  }
}
