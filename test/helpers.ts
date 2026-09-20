export const nth = <T>(items: readonly T[], index: number): T => {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`Expected an item at index ${index}, got ${items.length}`);
  }
  return item;
};
