export type History<T> = { past: T[]; present: T; future: T[] };
export function commit<T>(history: History<T>, next: T): History<T> {
  return {
    past: [...history.past, history.present].slice(-20),
    present: next,
    future: [],
  };
}
export function undo<T>(history: History<T>): History<T> {
  if (!history.past.length) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past.at(-1)!,
    future: [history.present, ...history.future],
  };
}
export function redo<T>(history: History<T>): History<T> {
  if (!history.future.length) return history;
  return {
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
  };
}
