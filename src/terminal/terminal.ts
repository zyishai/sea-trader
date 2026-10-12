import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

const ENTER_ALT_SCREEN = "\x1b[?1049h";
const EXIT_ALT_SCREEN = "\x1b[?1049l";
const ENABLE_MOUSE_TRACKING = "\x1b[?1000h\x1b[?1006h";
const DISABLE_MOUSE_TRACKING = "\x1b[?1000l\x1b[?1006l";
// SGR mouse report: ESC [ < button ; column ; row (M = press, m = release)
// eslint-disable-next-line no-control-regex
const MOUSE_REPORT = /\x1b\[<(\d+);\d+;\d+[Mm]/g;
const WHEEL_DELTAS: Record<string, number> = { "64": -1, "65": 1 };

export const mouseWheel = new EventEmitter();

export const setMouseTracking = (stdout: NodeJS.WriteStream, enabled: boolean) =>
  stdout.write(enabled ? ENABLE_MOUSE_TRACKING : DISABLE_MOUSE_TRACKING);

export const enterFullScreen = (stdout: NodeJS.WriteStream) => stdout.write(ENTER_ALT_SCREEN);

export function exitFullScreen(stdout: NodeJS.WriteStream) {
  setMouseTracking(stdout, false);
  stdout.write(EXIT_ALT_SCREEN);
}

/**
 * Wraps stdin so mouse reports never reach Ink as key presses.
 * Mouse wheel movements are emitted on `mouseWheel` as "scroll" events instead.
 */
export function createInputStream(source: NodeJS.ReadStream): NodeJS.ReadStream {
  const input = Object.assign(new PassThrough({ encoding: "utf8" }), {
    isTTY: source.isTTY,
    setRawMode(mode: boolean) {
      source.setRawMode?.(mode);
      return input;
    },
    ref() {
      source.ref();
      return input;
    },
    unref() {
      source.unref();
      return input;
    },
  });

  source.setEncoding("utf8");
  source.on("data", (chunk: string) => {
    const keys = chunk.replace(MOUSE_REPORT, (_, button: string) => {
      const delta = WHEEL_DELTAS[button];
      if (delta) mouseWheel.emit("scroll", delta);
      return "";
    });
    if (keys) input.write(keys);
  });

  return input as unknown as NodeJS.ReadStream;
}
