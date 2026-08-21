// Tiny event bus. Pure — safe to import in Node.

export function makeBus() {
  const m = new Map();
  return {
    on(ev, fn) {
      let s = m.get(ev);
      if (!s) { s = new Set(); m.set(ev, s); }
      s.add(fn);
      return () => s.delete(fn);
    },
    emit(ev, ...args) {
      const s = m.get(ev);
      if (s) for (const fn of s) fn(...args);
    },
  };
}
