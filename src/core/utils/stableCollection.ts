export const collectionSignature = <T>(items: T[]): string => {
    try {
        return JSON.stringify(items);
    } catch {
        return `${items.length}:${Date.now()}`;
    }
};

export const mergeById = <T extends { id: string }>(
    previous: T[],
    incoming: T[],
    sortFn?: (a: T, b: T) => number,
): T[] => {
    const byId = new Map(previous.map(item => [item.id, item]));
    for (const item of incoming) byId.set(item.id, item);
    const merged = Array.from(byId.values());
    return sortFn ? merged.sort(sortFn) : merged;
};

