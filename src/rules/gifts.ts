import { DECO, type Deco } from "../art/deco";
import { bloomCount, type Garden } from "./garden";

// A gift stays in the garden, also when a bloom wilts later.
export function claimGifts(garden: Garden): Deco | null {
  const blooms = bloomCount(garden);
  let newest = null;
  for (const deco of DECO) {
    if (deco.at <= blooms && !garden.deco.includes(deco.id)) {
      garden.deco.push(deco.id);
      newest = deco;
    }
  }
  return newest;
}

export function nextGift(garden: Garden): { gift: Deco | null; need: number } {
  const blooms = bloomCount(garden);
  const gift = DECO.find((deco) => !garden.deco.includes(deco.id)) || null;
  return { gift, need: (gift ? gift.at : 100) - blooms };
}
