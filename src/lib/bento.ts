/** Shared bento grid layout, used by the real results and by their loading skeleton so both line up. */
export const BENTO_GRID =
  "grid grid-flow-dense grid-cols-2 auto-rows-[104px] gap-2 sm:grid-cols-3 sm:auto-rows-[132px] sm:gap-3 lg:grid-cols-4";

/** Deterministic span pattern: the closest match is a hero tile, then the odd wide and tall tile. */
export function bentoSpan(index: number): string {
  const slot = index % 11;
  if (slot === 0) return "col-span-2 row-span-2";
  if (slot === 5) return "col-span-2";
  if (slot === 8) return "row-span-2";
  return "";
}

export function isHeroTile(index: number): boolean {
  return index % 11 === 0;
}
