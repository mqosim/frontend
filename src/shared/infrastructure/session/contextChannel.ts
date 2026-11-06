/**
 * A thin wrapper over `BroadcastChannel` shared by the session and idle runtimes,
 * so both contexts use one messaging layer. Returns `null` where the API is
 * unavailable, and every caller treats cross-tab messaging as best-effort.
 */
export interface ContextChannel {
  post(message: unknown): void
  close(): void
}

export const createContextChannel = (
  name: string,
  onMessage: (data: unknown) => void,
): ContextChannel | null => {
  if (typeof BroadcastChannel === 'undefined') return null
  const channel = new BroadcastChannel(name)
  channel.onmessage = (event: MessageEvent<unknown>) => onMessage(event.data)
  return {
    post: (message) => {
      channel.postMessage(message)
    },
    close: () => {
      channel.close()
    },
  }
}
