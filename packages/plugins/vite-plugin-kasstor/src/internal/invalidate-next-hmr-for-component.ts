const shouldInvalidateNextUpdate = new Set<string>();

export const invalidateNextUpdateForComponents = (componentNames: string[]) => {
  componentNames.forEach(name => shouldInvalidateNextUpdate.add(name));
};

/**
 * Checks if the next update for a component should be invalidated.
 * If the component is marked for invalidation, it will be removed from the set,
 * preventing subsequent invalidations until it is marked again.
 */
export const checkIfShouldInvalidateNextUpdate = (componentName: string) => {
  const invalidUpdate = shouldInvalidateNextUpdate.has(componentName);

  shouldInvalidateNextUpdate.delete(componentName);

  return invalidUpdate;
};

