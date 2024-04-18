import { type Device, findByIds } from 'usb';

const BRIGHTNESS_MIN = 400.0;
const BRIGHTNESS_MAX = 60000.0;
const BRIGHTNESS_RANGE = BRIGHTNESS_MAX - BRIGHTNESS_MIN;

const HID_REPORT_TYPE_FEATURE = 0x0300;
const HID_GET_REPORT = 0x01;
const HID_SET_REPORT = 0x09;

const DIRECTION_IN = 1 << 7;
const DIRECTION_OUT = 0 << 7;
const TYPE_CLASS = 1 << 5;
const RECIPIENT_INTERFACE = 1;

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

  const data = await controlTransfer(display, DIRECTION_IN, HID_GET_REPORT, 7);
  return nitsToPercent(data.readUInt16LE(1));
}

export async function setBrightness(percent: number) {
  if (percent < 0 || percent > 100) throw new Error('expected percent within range [0, 100]');

  const display = getDisplay();
  if (!display) throw new Error(`can't connect to studio display`);

  const data = makeRequestData(percentToNits(percent));
  await controlTransfer(display, DIRECTION_OUT, HID_SET_REPORT, data);
}

function controlTransfer<D extends number | Buffer>(
  display: Device,
  dir: typeof DIRECTION_IN | typeof DIRECTION_OUT,
  report: typeof HID_GET_REPORT | typeof HID_SET_REPORT,
  data: D,
): Promise<D extends number ? Buffer : number> {
  return new Promise((resolve, reject) => {
    display.open();
    display.interface(SD_BRIGHTNESS_INTERFACE).claim();
    display.controlTransfer(
      makeRequestType(dir),
      report,
      HID_REPORT_TYPE_FEATURE | SD_REPORT_ID,
      SD_BRIGHTNESS_INTERFACE,
      data,
      (err, data) => {
        if (err) return reject(err);
        resolve(data as any);
      },
    );
  });
}

function makeRequestType(dir: typeof DIRECTION_IN | typeof DIRECTION_OUT) {
  return dir | TYPE_CLASS | RECIPIENT_INTERFACE;
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
