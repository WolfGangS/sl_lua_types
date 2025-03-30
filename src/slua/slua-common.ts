import {
  NamedVarOpType,
  SLuaBaseType,
  SLuaFuncResult,
} from "./slua-json-gen.ts";

export function mapResultToFunctionString(results: SLuaFuncResult[]): string {
  return results.map(mapArgToFunctionString).join(", ");
}

export function mapSLuaTypeToString(t: SLuaBaseType): string {
  if (typeof t == "string") return t;
  if (isTypeCustom(t)) {
    return t.custom;
  } else if (isTypeValue(t)) {
    return t.value;
  } else {
    console.error(t);
    throw new Error("Unknown type handle");
  }
}

export function mapArgToFunctionString(arg: NamedVarOpType): string {
  const types = arg.type.map(mapSLuaTypeToString);

  let str = types.filter((t) => t != "self").join("|");

  if (arg.variadic || arg.optional) {
    if (arg.type.length > 1) {
      str = `(${str})`;
    }
    if (arg.variadic) str = `...${str}`;
    if (arg.optional) str = `${str}?`;
  }

  if (arg.name && !arg.variadic) {
    if (str) {
      str = `${arg.name}: ${str}`;
    } else {
      str = arg.name;
    }
  }

  return str;
}

export function isTypeCustom(c: unknown): c is { custom: string } {
  if (typeof c != "object") return false;
  if (c == null) return false;
  if (c instanceof Array) return false;
  return Object.hasOwn(c, "custom");
}

export function isTypeValue(c: unknown): c is { value: string } {
  if (typeof c != "object") return false;
  if (c == null) return false;
  if (c instanceof Array) return false;
  return Object.hasOwn(c, "value");
}
