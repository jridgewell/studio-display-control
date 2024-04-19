import { Device, Interface, getDeviceList } from 'usb';
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

const ifaceRelease = promisify(Interface.prototype.release);
const devControlTransfer = promisify(Device.prototype.controlTransfer);
const devGetStringDesc = promisify(Device.prototype.getStringDescriptor);

export function getDisplays() {
  const devices = getDeviceList();
  const displays: Display[] = [];
  for (const dev of devices) {
    const desc = dev.deviceDescriptor;
    if (desc.idVendor === SD_VENDOR_ID && desc.idProduct === SD_PRODUCT_ID) {
      displays.push(new Display(dev));
    }
  }

  return displays;
}

class Display {
  private _device: Device;
  private _queue = 0;
  private _open: null | Device = null;
  private _claimed: null | Interface = null;

  constructor(dev: Device) {
    this._device = dev;
  }

  async getBrightness() {
    const response = await this._guard(() =>
      controlTransfer(this._device, Direction.In, Report.Get, 7),
    );
    return nitsToPercent(response.readUInt16LE(1));
  }

  async setBrightness(percent: number) {
    if (percent < 0 || percent > 100) throw new Error('expected percent within range [0, 100]');

    const data = makeRequestData(percentToNits(percent));
    await this._guard(() => controlTransfer(this._device, Direction.Out, Report.Set, data));
  }

  async getSerialNumber() {
    return this._guard(() => {
      const display = this._device;
      const desc = display.deviceDescriptor;
      return devGetStringDesc.call(display, desc.iSerialNumber);
    });
  }

  private async _guard<R>(fn: () => R): Promise<R> {
    try {
      this._enter();
      return await fn();
    } finally {
      await this._exit();
    }
  }

  private _enter() {
    const display = this._device;
    this._queue++;
    if (!this._open) {
      display.open();
      this._open = display;
    }
    if (!this._claimed) {
      const iface = display.interface(SD_BRIGHTNESS_INTERFACE);
      iface.claim();
      this._claimed = iface;
    }
    return display;
  }

  private async _exit() {
    if (--this._queue === 0) {
      try {
        if (this._claimed) {
          await ifaceRelease.call(this._claimed);
          if (this._queue > 0) return;
          this._claimed = null;
        }
      } catch (e) {
        console.error('failed to release interface', e);
      }
      try {
        this._open?.close();
        this._open = null;
      } catch (e) {
        console.error('failed to close device', e);
      }
    }
  }
}

function controlTransfer<D extends number | Buffer>(
  display: Device,
  direction: Direction,
  report: Report,
  data: D,
): Promise<D extends number ? Buffer : number> {
  return devControlTransfer.call(
    display,
    makeRequestType(direction),
    report,
    HID_REPORT_TYPE_FEATURE | SD_REPORT_ID,
    SD_BRIGHTNESS_INTERFACE,
    data,
  ) as any;
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
