import { canGrow, keyOf, type Fact, type Garden } from "./garden";

export interface Comeback {
  key: string;
  due: number;
}

export interface Queue {
  qn: number;
  last: string | null;
  comeback: Comeback[];
}

export function pool(rows: number[]): string[] {
  const keys = [];
  for (const a of rows) {
    for (let b = 1; b <= 10; b++) keys.push(keyOf(a, b));
  }
  return keys;
}

// Errors come back often. Mastered facts and plants that can not grow today come rarely.
export function weight(fact: Fact | undefined, today: number): number {
  if (!fact || !fact.seen) return 2.5;
  if (fact.wilt) return 12 + Math.min(fact.wrong, 5) * 2;
  if (!canGrow(fact, today)) return 0.5;
  return [7, 5, 3, 1.4][fact.lvl];
}

export function pickNext(
  garden: Garden,
  queue: Queue,
  today: number,
  random = Math.random,
): string {
  const keys = pool(garden.rows);
  const due = queue.comeback.findIndex(
    (c) => c.due <= queue.qn && c.key !== queue.last && keys.includes(c.key),
  );
  if (due >= 0) return queue.comeback.splice(due, 1)[0].key;
  let total = 0;
  const weights = keys.map((key) => {
    const w =
      key === queue.last && keys.length > 1
        ? 0
        : weight(garden.facts[key], today);
    total += w;
    return w;
  });
  let r = random() * total;
  for (let i = 0; i < keys.length; i++) {
    if ((r -= weights[i]) < 0) return keys[i];
  }
  return keys[keys.length - 1];
}
