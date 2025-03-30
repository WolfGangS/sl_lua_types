import { StrObj } from "./types.d.ts";

export function isStrObj(val: unknown): val is StrObj<unknown> {
  if (typeof val != "object") return false;
  if (val === null) return false;
  if (val instanceof Array) return false;
  return true;
}
