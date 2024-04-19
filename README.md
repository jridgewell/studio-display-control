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
import { getDisplays } from 'studio-display-control';

for (const display of getDisplays()) {
  // Get the current brightness as a percent.
  console.log(await display.getBrightness()); // 100

  // Set the brightness as a percent.
  console.log(await display.setBrightness(50));
  // And it's reflected on the next get.
  console.log(await display.getBrightness()); // 50

  // Access the serial number of the display.
  console.log(await display.getSerialNumber());
}
```

# License

MIT
