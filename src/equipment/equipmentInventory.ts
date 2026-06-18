export function getInventoryItemCount(
  inventory: readonly string[],
  itemId: string,
): number {
  return inventory.reduce(
    (count, id) => count + (id === itemId ? 1 : 0),
    0,
  )
}

export function getUniqueInventoryItemIds(
  inventory: readonly string[],
): string[] {
  return [...new Set(inventory)]
}
