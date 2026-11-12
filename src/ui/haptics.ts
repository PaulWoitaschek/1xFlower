import { store } from "./state";

const PATTERNS = {
  tap: 6,
  good: 16,
  bad: [30, 60, 30],
  bloom: [18, 40, 18, 40, 60],
};

let switchLabel: HTMLLabelElement | null = null;

export function haptic(kind: keyof typeof PATTERNS) {
  if (!store.haptic) return;
  const pattern = PATTERNS[kind];
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
    return;
  }
  // iPhone Safari has no vibrate(); toggling a native switch gives a light tick there
  try {
    if (!switchLabel) {
      switchLabel = document.createElement("label");
      switchLabel.setAttribute("aria-hidden", "true");
      switchLabel.style.cssText =
        "position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("switch", "");
      input.tabIndex = -1;
      switchLabel.appendChild(input);
      document.body.appendChild(switchLabel);
    }
    const ticks = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1;
    switchLabel.click();
    for (let k = 1; k < ticks; k++) {
      setTimeout(() => switchLabel && switchLabel.click(), k * 110);
    }
  } catch {}
}
