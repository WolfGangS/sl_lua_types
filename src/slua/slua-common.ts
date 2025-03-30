import {
  NamedVarOpType,
  SLuaBaseType,
  SLuaFuncDef,
  SLuaFuncResult,
  SLuaFuncSig,
  SLuaType,
} from "./slua-json-gen.ts";

export function mapResultToFunctionString(results: SLuaFuncResult[]): string {
  return results.map((r) => mapArgToFunctionString(r)).join(", ");
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

export function generateCombinedDefinition(ofunc: SLuaFuncDef) {
  const args = [];
  const ress = [];
  const func: SLuaFuncDef = JSON.parse(JSON.stringify(ofunc));
  for (const sig of func.signatures) {
    let addArg = false;
    while (args.length < sig.args.length) {
      args.push(sig.args[args.length]);
      addArg = true;
    }
    if (!addArg) {
      for (let i = 0; i < sig.args.length; i++) {
        const arg = sig.args[i];
        args[i].type = [...new Set([...args[i].type, ...arg.type])];
      }
    }
    let addRes = false;
    while (ress.length < sig.result.length) {
      ress.push(sig.result[ress.length]);
      addRes = true;
    }
    if (!addRes) {
      for (let i = 0; i < sig.result.length; i++) {
        const res = sig.result[i];
        ress[i].type = [...new Set([...ress[i].type, ...res.type])];
      }
    }
  }

  return `(${mapArgsToFunctionParamString(args, true)}) : ${
    mapResultToFunctionString(ress)
  }`;
}

export function mapArgsToFunctionParamString(
  args: NamedVarOpType[],
  cleanup: boolean = false,
): string {
  return args.map((a) => doMapArgToFunctionString(a, cleanup)).join(", ");
}

export function mapArgToFunctionString(
  arg: NamedVarOpType,
): string {
  return doMapArgToFunctionString(arg, false);
}

function doMapArgToFunctionString(
  arg: NamedVarOpType,
  cleanup: boolean = false,
): string {
  const types = (cleanup ? cleanTypes(arg.type) : arg.type).map(
    mapSLuaTypeToString,
  );

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

export function generatePreferedCodeSample(
  prefix: string[],
  func: SLuaFuncDef,
): [string, number] {
  let str = generateCodeSample(
    prefix,
    func,
    0,
    0,
    func.signatures[0].args.length > 3,
  );
  let sigIndex = 0;
  let args = func.signatures[0].args.length;
  for (let i = 1; i < func.signatures.length; i++) {
    for (let o = 0; o < 5; o++) {
      const nStr = generateCodeSample(
        prefix,
        func,
        i,
        o,
        func.signatures[i].args.length > 3,
      );
      const nArgs = func.signatures[i].args.length;
      if (samplePrefered(nStr, str) || nArgs > args) {
        str = nStr;
        args = nArgs;
        sigIndex = i;
      }
    }
  }
  return [str, sigIndex];
}

export function generateCodeSample(
  prefix: string[],
  func: SLuaFuncDef,
  sigIndex: number,
  off: number = 0,
  verbose: boolean = false,
): string {
  const name = [...prefix, func.name].join(".");
  return generateCodeSampleForSig(
    name,
    func.signatures[sigIndex],
    off,
    verbose,
  );
}

function samplePrefered(sample1: string, sample2: string) {
  const intc1 = sample1.split("integer(").length - 1;
  const intc2 = sample2.split("integer(").length - 1;
  return intc1 < intc2;
}

function generateCodeSampleForSig(
  name: string,
  sig: SLuaFuncSig,
  off: number = 0,
  verbose: boolean = false,
): string {
  const args = [];
  for (const arg of sig.args) {
    const type = cleanType(arg.type, off);
    switch (type) {
      case "quaternion":
        args.push("quaternion(0,0,0,1)");
        break;
      case "integer":
        args.push("integer(1)");
        break;
      case "numeric":
        args.push(Math.floor(Math.random() * 16));
        break;
      case "number":
        args.push("3.14");
        break;
      case "list":
      case "{}":
        args.push("{}");
        break;
      case "uuid":
        if (verbose) {
          args.push("uuid('677bf9a4-bba5-4cf9-a4ad-4802a0f7ef46')");
        } else {
          args.push("uuid(<key>)");
        }
        break;
      case "vector":
        args.push("vector(1,1,1)");
        break;
      case "boolean":
        args.push("true");
        break;
      case "string":
        args.push("'test'");
        break;
      default:
        if (isTypeCustom(type)) {
          args.push(type.custom);
        } else if (isTypeValue(type)) {
          args.push(type.value);
        } else {
          args.push("nil");

          console.trace("Can't create default for:", arg);
          throw "AAAAAAAAA";
        }
        break;
    }
  }
  if (verbose) {
    return `${name}(\n  ${args.join(",\n  ")}\n)`;
  } else {
    return `${name}(${args.join(", ")})`;
  }
}

function cleanTypes(type: SLuaBaseType[]): SLuaBaseType[] {
  if (type.length == 2) {
    if (type.includes("number") && type.includes("integer")) {
      return ["number"];
    }
    if (type.includes("uuid") && type.includes("string")) {
      return ["uuid"];
    }
  }
  return type;
}

function cleanType(stype: SLuaType, off: number = 0): SLuaBaseType {
  if (stype instanceof Array) {
    if (off >= stype.length) off = 0;
    if (stype.includes("number") && stype.includes("integer")) {
      return "numeric";
    }
  }
  const type = stype instanceof Array ? stype[off] : stype;
  if (type == null) {
    console.trace(stype);
    throw new Error("Cannot cleantype null for generated function");
  }
  return type;
  //   if (typeof type == "object") {
  //     console.error(type);
  //     throw new Error("Failed to case type for docs");
  //   } else {
  //     return type;
  //   }
}
