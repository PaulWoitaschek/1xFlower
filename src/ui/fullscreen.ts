import { $ } from "./dom";

// Safari on the iPad still names the calls with the webkit prefix
type Doc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type El = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const doc = document as Doc;

function isFull() {
  return !!(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

async function toggle() {
  try {
    if (isFull()) {
      await (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc);
    } else {
      const root = document.documentElement as El;
      await (root.requestFullscreen ?? root.webkitRequestFullscreen)?.call(
        root,
      );
    }
  } catch {}
}

function sync() {
  const btn = $("fullBtn");
  const full = isFull();
  btn.setAttribute("aria-pressed", String(full));
  btn.setAttribute("aria-label", full ? "Vollbild beenden" : "Vollbild");
  btn.title = full ? "Vollbild beenden" : "Vollbild";
}

/** shows the fullscreen button where the browser can go fullscreen (not on the iPhone) */
export function initFullscreen() {
  const btn = $("fullBtn");
  if (!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled)) return;
  btn.hidden = false;
  btn.onclick = toggle;
  document.addEventListener("fullscreenchange", sync);
  document.addEventListener("webkitfullscreenchange", sync);
  sync();
}
