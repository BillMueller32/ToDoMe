// The list lives on the device (localStorage), so the app opens instantly and works offline.
// Changes are queued and pushed to the server in the background; other devices' changes are
// pulled in the same request. Newest change to an item wins.

import { useSyncExternalStore } from "react";
import type { Item } from "./items";

const K_ITEMS = "todome:items";
const K_CURSOR = "todome:cursor";
const K_PENDING = "todome:pending";

export type SyncStatus = "idle" | "syncing" | "offline" | "signed-out" | "error";

interface State {
  items: Map<string, Item>;
  pending: Set<string>;
  cursor: number;
  status: SyncStatus;
  lastSynced: number | null;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const state: State = {
  items: new Map(load<Item[]>(K_ITEMS, []).map((i) => [i.id, i])),
  pending: new Set(load<string[]>(K_PENDING, [])),
  cursor: load<number>(K_CURSOR, 0),
  status: "idle",
  lastSynced: null,
};

// ---------- subscriptions ----------
const listeners = new Set<() => void>();
let snapshot = { items: [...state.items.values()], status: state.status };
function emit() {
  snapshot = { items: [...state.items.values()], status: state.status };
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function useStore() {
  return useSyncExternalStore(subscribe, () => snapshot);
}

let persistTimer: number | undefined;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(K_ITEMS, JSON.stringify([...state.items.values()]));
      localStorage.setItem(K_PENDING, JSON.stringify([...state.pending]));
      localStorage.setItem(K_CURSOR, JSON.stringify(state.cursor));
    } catch {
      /* storage full or blocked: the server copy still has everything once synced */
    }
  }, 50);
}
window.addEventListener("pagehide", () => {
  clearTimeout(persistTimer);
  try {
    localStorage.setItem(K_ITEMS, JSON.stringify([...state.items.values()]));
    localStorage.setItem(K_PENDING, JSON.stringify([...state.pending]));
    localStorage.setItem(K_CURSOR, JSON.stringify(state.cursor));
  } catch {
    /* ignore */
  }
});

// ---------- writes ----------
let lastStamp = 0;
/** A timestamp that always moves forward, even for two edits in the same millisecond. */
export function stamp(): number {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function save(...items: Item[]) {
  for (const it of items) {
    state.items.set(it.id, it);
    state.pending.add(it.id);
  }
  persist();
  emit();
  scheduleSync(400);
}

export function update(id: string, patch: Partial<Item>) {
  const cur = state.items.get(id);
  if (!cur) return;
  save({ ...cur, ...patch, updatedAt: stamp() });
}

export function remove(id: string) {
  update(id, { deleted: true });
}

// ---------- sync ----------
let inflight: Promise<void> | null = null;
let again = false;
let timer: number | undefined;

export function scheduleSync(delay = 0) {
  clearTimeout(timer);
  timer = window.setTimeout(() => void sync(), delay);
}

function setStatus(s: SyncStatus) {
  if (state.status !== s) {
    state.status = s;
    emit();
  }
}

export async function sync(): Promise<void> {
  if (inflight) {
    again = true;
    return inflight;
  }
  inflight = (async () => {
    try {
      setStatus("syncing");
      let more = true;
      while (more) {
        const sentIds = [...state.pending].slice(0, 500);
        const changes = sentIds.map((id) => state.items.get(id)).filter(Boolean) as Item[];
        const sentAt = new Map(changes.map((c) => [c.id, c.updatedAt]));

        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ since: state.cursor, changes }),
        });
        if (res.status === 401) {
          setStatus("signed-out");
          return;
        }
        if (!res.ok) throw new Error(`sync ${res.status}`);
        const data = (await res.json()) as { items: Item[]; cursor: number; more: boolean };

        // Sent and not edited again while in flight → no longer pending.
        for (const [id, at] of sentAt) {
          if (state.items.get(id)?.updatedAt === at) state.pending.delete(id);
        }
        for (const remote of data.items) {
          const local = state.items.get(remote.id);
          if (local && state.pending.has(remote.id) && local.updatedAt > remote.updatedAt) continue;
          state.items.set(remote.id, remote);
          state.pending.delete(remote.id);
        }
        state.cursor = Math.max(state.cursor, data.cursor);
        more = data.more || state.pending.size > 0 && sentIds.length === 500;
        persist();
        emit();
      }
      state.lastSynced = Date.now();
      setStatus("idle");
    } catch {
      setStatus(navigator.onLine ? "error" : "offline");
      scheduleSync(15_000);
    } finally {
      inflight = null;
      if (again) {
        again = false;
        scheduleSync(0);
      }
    }
  })();
  return inflight;
}

export async function signIn(password: string): Promise<"ok" | "wrong" | "not-set-up" | "error"> {
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setStatus("idle");
      await sync();
      return "ok";
    }
    if (res.status === 401) return "wrong";
    if (res.status === 503) return "not-set-up";
    return "error";
  } catch {
    return "error";
  }
}

export async function signOut() {
  await fetch("/api/logout", { method: "POST" }).catch(() => {});
  try {
    localStorage.removeItem(K_ITEMS);
    localStorage.removeItem(K_PENDING);
    localStorage.removeItem(K_CURSOR);
  } catch {
    /* ignore */
  }
  state.items.clear();
  state.pending.clear();
  state.cursor = 0;
  setStatus("signed-out");
}

// Keep devices in step: on open, when the app comes back to the foreground, when the
// network returns, and every 30s while visible.
export function startSync() {
  void sync();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleSync(0);
  });
  window.addEventListener("online", () => scheduleSync(0));
  window.setInterval(() => {
    if (document.visibilityState === "visible") void sync();
  }, 30_000);
}
