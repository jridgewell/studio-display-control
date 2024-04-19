import { Device, findByIds, Interface } from 'usb';
import { promisify } from 'util';

const BRIGHTNESS_MIN = 400.0;
const BRIGHTNESS_MAX = 60000.0;
const BRIGHTNESS_RANGE = BRIGHTNESS_MAX - BRIGHTNESS_MIN;

const HID_REPORT_TYPE_FEATURE = 0x0300;
const enum Report {
  Get = 0x01,
  Set = 0x09,
}
const enum Direction {
  In = 1 << 7,
  Out = 0 << 7,
}
const enum Type {
  Class = 1 << 5,
}
const enum Recipient {
  Interface = 1,
}

const SD_BRIGHTNESS_INTERFACE = 0x7;
const SD_REPORT_ID = 0x01;
const SD_PRODUCT_ID = 0x1114;
const SD_VENDOR_ID = 0x05ac;

function getDisplay() {
  return findByIds(SD_VENDOR_ID, SD_PRODUCT_ID);
}

export function hasDisplay() {
  return !!getDisplay();
}

export async function getBrightness() {
  const display = getDisplay();
  if (!display) throw new Error(`can't connect to studio display`);

  const data = await controlTransfer(display, Direction.In, Report.Get, 7);
  return nitsToPercent(data.readUInt16LE(1));
}

export async function setBrightness(percent: number) {
  if (percent < 0 || percent > 100) throw new Error('expected percent within range [0, 100]');

  const display = getDisplay();
  if (!display) throw new Error(`can't connect to studio display`);

  const data = makeRequestData(percentToNits(percent));
  await controlTransfer(display, Direction.Out, Report.Set, data);
}

const ifaceRelease = promisify(Interface.prototype.release);
const devControlTransfer = promisify(Device.prototype.controlTransfer);
async function controlTransfer<D extends number | Buffer>(
  display: Device,
  dir: Direction,
  report: Report,
  data: D,
): Promise<D extends number ? Buffer : number> {
  const dispose: Array<() => void | Promise<void>> = [];
  try {
    display.open();
    dispose.unshift(() => display.close());

    const iface = display.interface(SD_BRIGHTNESS_INTERFACE);
    iface.claim();
    dispose.unshift(() => ifaceRelease.call(iface));

    const out = await devControlTransfer.call(
      display,
      makeRequestType(dir),
      report,
      HID_REPORT_TYPE_FEATURE | SD_REPORT_ID,
      SD_BRIGHTNESS_INTERFACE,
      data,
    );
    return out as any;
  } finally {
    for (const d of dispose) {
      try {
        await d();
      } catch (e) {
        console.error('additional error', e);
      }
    }
  }
}

function makeRequestType(dir: Direction) {
  return dir | Type.Class | Recipient.Interface;
}

function makeRequestData(nits: number) {
  const bytes = Buffer.alloc(7);
  bytes[0] = 0x01;
  bytes.writeUInt16LE(nits, 1);
  return bytes;
}

function percentToNits(percent: number) {
  const factor = percent / 100.0;
  const scaled = BRIGHTNESS_RANGE * factor;
  return BRIGHTNESS_MIN + scaled;
}

function nitsToPercent(nits: number) {
  const scaled = nits - BRIGHTNESS_MIN;
  const factor = scaled / BRIGHTNESS_RANGE;
  return factor * 100.0;
}
