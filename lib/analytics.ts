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

  const params = new URLSearchParams(window.location.search);
  const payload = {
    category,
    action,
    label: label ?? "",
    path: window.location.pathname,
    referrer: document.referrer,
    source: params.get("utm_source") ?? "",
    medium: params.get("utm_medium") ?? "",
    campaign: params.get("utm_campaign") ?? "",
  };

  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    return;
  }

  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
