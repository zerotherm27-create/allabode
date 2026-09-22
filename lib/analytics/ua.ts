import { UAParser } from "ua-parser-js";
import { isBot } from "ua-parser-js/bot-detection";

const BOT_BACKSTOP = /bot|crawl|spider|slurp|facebookexternalhit|pingdom|uptimerobot|monitor|headless/i;

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export function parseUserAgent(ua: string | null) {
  if (!ua) return { isBot: true, deviceType: "unknown" as DeviceType, os: null, browser: null };

  if (isBot(ua) || BOT_BACKSTOP.test(ua)) {
    return { isBot: true, deviceType: "unknown" as DeviceType, os: null, browser: null };
  }

  const result = UAParser(ua);
  const deviceType: DeviceType =
    result.device.type === "mobile" || result.device.type === "tablet"
      ? result.device.type
      : result.device.type
        ? "unknown"
        : "desktop";

  return {
    isBot: false,
    deviceType,
    os: result.os.name || null,
    browser: result.browser.name || null,
  };
}
