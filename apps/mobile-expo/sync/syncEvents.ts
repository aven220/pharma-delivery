type Listener = () => void;

const listeners = new Set<Listener>();

export function onDeliveriesSync(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyDeliveriesSync(): void {
  listeners.forEach((fn) => fn());
}
