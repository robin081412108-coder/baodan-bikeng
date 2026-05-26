type BaiduEventValue = string | number;

declare global {
  interface Window {
    _hmt?: BaiduEventValue[][];
  }
}

export function trackEvent(category: string, action: string, label?: string) {
  if (typeof window === "undefined") {
    return;
  }

  const queue = (window._hmt ??= []);
  queue.push(["_trackEvent", category, action, label ?? ""]);
}
