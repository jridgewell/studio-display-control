# studio-display-control

Set the brightness of an Apple Studio Display in Node.js.


## Why?

So that I can control the brightness in Windows.


## Installation

```bash
npm install studio-display-control
```


## Usage

```typescript
import { hasDisplay, getBrightness, setBrightness } from 'studio-display-control';

// Check if a Studio Display is connected
hasDisplay(); // true

// Get the current brightness as a percent.
console.log(getBrightness()); // 100

//Set the brightness as a percent.
console.log(setBrightness(50));

console.log(getBrightness()); // 50
```

# License

MIT
