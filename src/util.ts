import { Override, Overrides, StrObj } from "./types.d.ts";

export function ucFirst(str: string): string {
    return str.slice(0, 1).toUpperCase() + str.slice(1);
}

export function isStrObj(val: unknown): val is StrObj<unknown> {
    if (typeof val != "object") return false;
    if (val === null) return false;
    if (val instanceof Array) return false;
    return true;
}

export function applyPatches(json: unknown, patches: Overrides): void {
    for (const patch of patches) {
        applyPatch(patch, json);
    }
}

function applyPatch(patch: Override, json: unknown): void {
    let obj: StrObj<unknown> | unknown[] | unknown = json;
    const path = [...patch.key].reverse();

    const err = new Error(
        `Path hit non indexable point, patch ${JSON.stringify(patch.key)}`,
    );

    while (path.length > 1) {
        const key = path.pop() as string | number;
        if (typeof key == "number" && isArray(obj, patch)) {
            obj = obj[key];
        } else if (typeof key == "string" && isPStrObj(obj, patch)) {
            obj = obj[key];
        } else {
            throw err;
        }
    }

    const key = path.pop();
    if (typeof key == "number" && isArray(obj, patch)) {
        obj[key] = patch.value;
    } else if (typeof key == "string" && isPStrObj(obj, patch)) {
        obj[key] = patch.value;
    } else {
        throw err;
    }
}

function isArray(obj: unknown, patch: Override): obj is unknown[] {
    if (obj instanceof Array) return true;
    throw new Error(
        `Indexing array with non number path ${JSON.stringify(patch)}`,
    );
}

function isPStrObj(
    obj: unknown,
    patch: Override,
): obj is StrObj<unknown> {
    if (!isStrObj(obj)) {
        console.error("Indexing StrObj with non string path", patch, obj);
        throw new Error(
            `Indexing StrObj with non string path ${JSON.stringify(patch)}`,
        );
    }
    return true;
}
