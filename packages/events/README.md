# Events
Better events for TypeScript!

## Example
```typescript
import { StrictEventEmitter } from '@dawg/events';

const events = new StrictEventEmitter<{ eventA: [string] }>();
const disposer = events.addEventListeners({
  eventA: (str) => {
    console.log(str);
  },
});

events.emit('eventA', 'some str'); // prints "some str"
events.emit('doesNotExist', 'some str'); // ERROR

disposer.dispose();
```

*There are lots of other available methods, check files (src/index.ts)*