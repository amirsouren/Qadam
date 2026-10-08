/**
 * Cross-tab / multi-window synchronization (PRD §6.4).
 *
 * Every mutation broadcasts on a `BroadcastChannel`. Other tabs (and other
 * windows of the same profile) receive the signal and reload their in-memory
 * snapshot from IndexedDB, so stale state conflicts are impossible.
 *
 * `BroadcastChannel` never delivers a message back to the posting tab, so the
 * originating tab reloads itself immediately after writing.
 */

const CHANNEL_NAME = 'qadam-sync';

export interface SyncMessage {
  type: 'data-changed';
  at: number;
}

type Listener = () => void;

let channel: BroadcastChannel | null = null;
let channelBroken = false;
const listeners = new Set<Listener>();

function ensureChannel(): BroadcastChannel | null {
  if (channelBroken) return channel;
  if (typeof BroadcastChannel === 'undefined') {
    channelBroken = true;
    return null;
  }
  if (!channel) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        const data = event.data;
        if (data && data.type === 'data-changed') {
          listeners.forEach((fn) => {
            try {
              fn();
            } catch {
              /* a broken listener must not break the rest */
            }
          });
        }
      };
      channel.onmessageerror = () => {
        /* ignore malformed payloads */
      };
    } catch {
      channelBroken = true;
      channel = null;
    }
  }
  return channel;
}

/** Subscribe to cross-tab change signals. Returns an unsubscribe function. */
export function subscribeToSync(listener: Listener): () => void {
  listeners.add(listener);
  ensureChannel();
  return () => {
    listeners.delete(listener);
  };
}

/** Notify every *other* tab that local data changed. */
export function broadcastChange(): void {
  const ch = ensureChannel();
  if (!ch) return;
  try {
    ch.postMessage({ type: 'data-changed', at: Date.now() });
  } catch {
    /* channel closed — nothing to do */
  }
}

/** Tear down (used by tests / hot reload). */
export function closeSyncChannel(): void {
  try {
    channel?.close();
  } catch {
    /* ignore */
  }
  channel = null;
  listeners.clear();
}
