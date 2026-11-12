export const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;

export function mk<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string | null,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
}

export const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
