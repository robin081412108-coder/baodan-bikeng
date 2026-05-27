import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type SiteEvent = {
  id: string;
  createdAt: string;
  category: string;
  action: string;
  label: string;
  path: string;
  referrer: string;
  source: string;
  medium: string;
  campaign: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");
const eventWriteState = globalThis as typeof globalThis & {
  __baodanEventWriteQueue?: Promise<unknown>;
};

function cleanText(value: unknown, maxLength = 120) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function normalizeEvent(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const event = value as Partial<SiteEvent>;

  if (!event.id || !event.createdAt || !event.category || !event.action) {
    return null;
  }

  return {
    id: String(event.id),
    createdAt: String(event.createdAt),
    category: String(event.category),
    action: String(event.action),
    label: String(event.label ?? ""),
    path: String(event.path ?? ""),
    referrer: String(event.referrer ?? ""),
    source: String(event.source ?? ""),
    medium: String(event.medium ?? ""),
    campaign: String(event.campaign ?? ""),
  };
}

function normalizeEvents(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeEvent).filter((event): event is SiteEvent => Boolean(event));
}

async function readEvents() {
  try {
    const content = await readFile(EVENTS_FILE, "utf8");
    return normalizeEvents(JSON.parse(content));
  } catch {
    return [];
  }
}

async function writeEvents(events: SiteEvent[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(EVENTS_FILE, `${JSON.stringify(events.slice(0, 5000), null, 2)}\n`, "utf8");
}

export async function listEvents() {
  return readEvents();
}

export async function createEvent(input: {
  category?: unknown;
  action?: unknown;
  label?: unknown;
  path?: unknown;
  referrer?: unknown;
  source?: unknown;
  medium?: unknown;
  campaign?: unknown;
}) {
  const category = cleanText(input.category, 40);
  const action = cleanText(input.action, 60);

  if (!category || !action) {
    throw new Error("Invalid analytics event");
  }

  const event: SiteEvent = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    category,
    action,
    label: cleanText(input.label, 80),
    path: cleanText(input.path, 160),
    referrer: cleanText(input.referrer, 200),
    source: cleanText(input.source, 80),
    medium: cleanText(input.medium, 80),
    campaign: cleanText(input.campaign, 80),
  };

  const previousWrite = eventWriteState.__baodanEventWriteQueue ?? Promise.resolve();
  const nextWrite = previousWrite
    .catch(() => undefined)
    .then(async () => {
      const events = await readEvents();
      events.unshift(event);
      await writeEvents(events);
    });

  eventWriteState.__baodanEventWriteQueue = nextWrite;
  await nextWrite;
  return event;
}
