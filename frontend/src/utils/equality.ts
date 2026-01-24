/**
 * Shallow equality check for objects and arrays.
 * Useful for memoization and change detection without expensive JSON serialization.
 */

export function shallowEqual<T>(
  obj1: T | null | undefined,
  obj2: T | null | undefined
): boolean {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return obj1 === obj2;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;

  const keys1 = Object.keys(obj1 as Record<string, unknown>);
  const keys2 = Object.keys(obj2 as Record<string, unknown>);

  if (keys1.length !== keys2.length) return false;

  return keys1.every(
    (key) =>
      (obj1 as Record<string, unknown>)[key] === (obj2 as Record<string, unknown>)[key]
  );
}

/**
 * Shallow equality check for arrays of objects.
 * Compares array length and each element's reference identity.
 */
export function shallowArrayEqual<T>(arr1: T[], arr2: T[]): boolean {
  if (arr1 === arr2) return true;
  if (arr1.length !== arr2.length) return false;
  return arr1.every((item, idx) => item === arr2[idx]);
}
