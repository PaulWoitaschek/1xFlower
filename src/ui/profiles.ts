import { flowerSVG } from "../art/flowers";
import { bloomCount, freshGarden, uid } from "../rules/garden";
import { $, mk } from "./dom";
import { haptic } from "./haptics";
import { sfx } from "./sound";
import { activeProfile, save, setGarden, store } from "./state";

const view = {
  edit: false,
  confirm: null as string | null,
  adding: false,
  flower: 1,
};
let activate: (id: string) => void;

function avatar(row: number) {
  const el = mk("span", "ava l4");
  el.innerHTML = flowerSVG(row);
  return el;
}

function nextFlower() {
  const used = store.profiles.map((p) => p.flower);
  for (let row = 1; row <= 10; row++) if (!used.includes(row)) return row;
  return 1;
}

export function updateWho() {
  const p = activeProfile();
  $("whoName").textContent = p ? p.name : "Profil wählen";
  $("whoAva").innerHTML = flowerSVG(p ? p.flower : 1);
  $("gTitle").textContent = p ? "Garten von " + p.name : "Mein Garten";
}

export function openProfiles() {
  view.edit = false;
  view.confirm = null;
  view.adding = !store.profiles.length;
  view.flower = nextFlower();
  $<HTMLInputElement>("pNewName").value = "";
  $("pErr").hidden = true;
  $("profiles").hidden = false;
  renderProfiles();
}

export function closeProfiles() {
  if (!activeProfile()) return;
  $("profiles").hidden = true;
}

function renderProfiles() {
  $("pTitle").textContent = view.adding
    ? "Neues Profil"
    : view.edit
      ? "Profile bearbeiten"
      : "Wer spielt?";
  const list = $("pList");
  list.innerHTML = "";
  list.hidden = view.adding;
  store.profiles.forEach((p) => {
    const row = mk("div", "prow" + (p.id === store.active ? " act" : ""));
    if (!view.edit) {
      const button = mk("button", "pbtn");
      const text = mk("span", "ptxt");
      text.append(
        mk("span", "pname", p.name),
        mk("span", "pmeta", bloomCount(store.data[p.id]) + " Blüten"),
      );
      button.append(avatar(p.flower), text);
      button.onclick = () => {
        if (p.id !== store.active) activate(p.id);
        $("profiles").hidden = true;
        sfx("good");
        haptic("good");
      };
      row.append(button);
    } else if (view.confirm === p.id) {
      const yes = mk("button", "btn solid-danger", "Ja, löschen");
      const no = mk("button", "btn", "Nein");
      yes.onclick = () => deleteProfile(p.id);
      no.onclick = () => {
        view.confirm = null;
        renderProfiles();
      };
      const text = mk("span", "ptxt");
      text.append(
        mk("span", "pq", "Garten von " + p.name + " wirklich löschen?"),
        mk("span", "pmeta", "Alle Blumen gehen verloren."),
      );
      text.style.flex = "1";
      row.append(avatar(p.flower), text, yes, no);
    } else {
      const input = mk("input", "pinput");
      input.value = p.name;
      input.maxLength = 20;
      input.id = "pn-" + p.id;
      input.setAttribute("aria-label", "Name von " + p.name);
      input.onchange = () => {
        const name = input.value.trim();
        if (name) {
          p.name = name;
          save();
          updateWho();
        } else input.value = p.name;
      };
      const remove = mk("button", "btn danger", "Löschen");
      remove.onclick = () => {
        view.confirm = p.id;
        renderProfiles();
      };
      row.append(avatar(p.flower), input, remove);
    }
    list.append(row);
  });
  $("pNewForm").hidden = !view.adding;
  $("pCancel").hidden = !store.profiles.length;
  $("pNewBtn").hidden = view.adding || view.edit;
  $("pEditBtn").hidden = view.adding || !store.profiles.length;
  $("pEditBtn").textContent = view.edit ? "Fertig" : "Profile bearbeiten";
  $("pClose").hidden = view.adding || view.edit || !activeProfile();
  if (view.adding) {
    const pick = $("pPick");
    pick.innerHTML = "";
    for (let row = 1; row <= 10; row++) {
      const button = mk("button", "l4");
      button.type = "button";
      button.setAttribute("aria-pressed", String(row === view.flower));
      button.setAttribute("aria-label", "Blume " + row);
      button.innerHTML = flowerSVG(row);
      button.onclick = () => {
        view.flower = row;
        sfx("tap");
        renderProfiles();
      };
      pick.append(button);
    }
  }
}

function deleteProfile(id: string) {
  store.profiles = store.profiles.filter((p) => p.id !== id);
  delete store.data[id];
  view.confirm = null;
  if (store.active === id) {
    store.active = null;
    if (store.profiles.length) activate(store.profiles[0].id);
    else {
      setGarden(freshGarden());
      updateWho();
    }
  }
  if (!store.profiles.length) {
    view.edit = false;
    view.adding = true;
    view.flower = 1;
  }
  save();
  renderProfiles();
}

// `onActivate` starts the game with the garden of a profile.
export function initProfiles(onActivate: (id: string) => void) {
  activate = onActivate;
  const nameInput = $<HTMLInputElement>("pNewName");
  $("pNewForm").onsubmit = (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      $("pErr").hidden = false;
      nameInput.focus();
      return;
    }
    const id = uid();
    store.profiles.push({ id, name, flower: view.flower });
    store.data[id] = freshGarden();
    activate(id);
    $("profiles").hidden = true;
    sfx("bloom");
    haptic("bloom");
  };
  $("pCancel").onclick = () => {
    view.adding = false;
    renderProfiles();
  };
  $("pNewBtn").onclick = () => {
    view.adding = true;
    view.flower = nextFlower();
    nameInput.value = "";
    $("pErr").hidden = true;
    renderProfiles();
    nameInput.focus();
  };
  $("pEditBtn").onclick = () => {
    view.edit = !view.edit;
    view.confirm = null;
    renderProfiles();
  };
  $("pClose").onclick = closeProfiles;
  $("whoBtn").onclick = openProfiles;
}
