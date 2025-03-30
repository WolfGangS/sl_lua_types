import { stringify } from "jsr:@std/yaml";
import {
  buildSluaJson,
  SLuaBaseType,
  SLuaConstDef,
  SLuaFuncDef,
  SLuaFuncSig,
  SLuaGlobal,
  SLuaGlobalTable,
  SLuaGlobalTableProps,
  VarOpType,
} from "./slua-json-gen.ts";
import { isTypeCustom, isTypeValue } from "./slua-common.ts";

type SeleneDef = SelenePropDef | SeleneFuncDef;

type SelenePropDef = {
  property: "read-only" | "new-fields" | "override-fields" | "full-write";
};

type SeleneFuncDef = {
  args: SeleneArgDef[];
  must_use: boolean;
};

type SeleneArgDef = {
  required?: boolean;
  observes?: "read" | "write" | "read-write";
  type: SeleneArgDefType | SeleneArgDefType[];
};

type SeleneArgDefType =
  | "any"
  | "bool"
  | "function"
  | "nil"
  | "number"
  | "string"
  | "table"
  | "..."
  | { display: string };

type Selene = {
  base: string;
  name: string;
  globals: SeleneGlobals;
};

type SeleneGlobals = { [k: string]: SeleneDef };

export async function buildSluaSelene(
  file: string,
  strict: boolean = true,
): Promise<string> {
  const data = await buildSluaJson(file, strict);
  const selene: Selene = {
    base: "luau",
    name: "sl_selene_defs",
    globals: {},
  };

  outputSluaGlobals(data.global, selene.globals);
  return stringify(selene);
}

function outputSluaGlobals(
  data: SLuaGlobal | SLuaGlobalTableProps,
  selene: SeleneGlobals,
  section: string = "",
): void {
  for (const key in data) {
    const entry = data[key];
    switch (entry.def) {
      case "class": {
        break;
      }
      case "const": {
        outputSluaConst(entry as SLuaConstDef, selene, section);
        break;
      }
      case "func": {
        outputSluaFunc(entry as SLuaFuncDef, selene, section);
        break;
      }
      case "table": {
        const table = entry as SLuaGlobalTable;
        selene[`${section}${table.name}`] = {
          property: section == "" ? "full-write" : "read-only",
        };
        outputSluaGlobals(table.props, selene, `${section}${table.name}.`);
        break;
      }
      case "event":
        break;
      default:
        console.error(entry);
        throw "WHAT EVEN AM I?";
    }
  }
}

function outputSluaConst(
  con: SLuaConstDef,
  globals: SeleneGlobals,
  section: string,
) {
  globals[`${section}${con.name}`] = { property: "read-only" };
}

function outputSluaFunc(
  func: SLuaFuncDef,
  globals: SeleneGlobals,
  section: string,
) {
  const args = buildFuncArgs(func.signatures);
  globals[`${section}${func.name}`] = {
    args,
    must_use: func.pure,
  };
}

function castVarOpToSelene(
  types: VarOpType[],
): SeleneArgDefType | SeleneArgDefType[] {
  let args: SeleneArgDefType[] = [];

  for (const vtype of types) {
    if (vtype.variadic) args.push("...");
    else {
      for (const type of vtype.type) {
        args.push(remapLSLArgType(type));
      }
    }
  }

  args = [...new Set(args)];

  if (args.length == 1) return args[0];
  else return args;
}

function newArgDef(required: boolean, types: VarOpType[]): SeleneArgDef {
  return {
    required,
    observes: "read",
    type: castVarOpToSelene(types),
  };
}

function buildFuncArgs(signatures: SLuaFuncSig[]): SeleneArgDef[] {
  const argSet: { count: number; types: VarOpType[]; required: boolean }[] = [];

  let most = 0;
  for (const sig of signatures) {
    for (let i = 0; i < sig.args.length; i++) {
      const arg = sig.args[i];
      if (i > (argSet.length - 1)) {
        argSet.push({ count: 0, types: [], required: true });
      }
      argSet[i].types.push(arg);
      argSet[i].count++;
      if (argSet[i].count > most) {
        most = argSet[i].count;
      }
    }
  }

  const args: SeleneArgDef[] = [];

  for (const arg of argSet) {
    if (arg.count > most) {
      throw Error("How Even?");
    }
    args.push(
      newArgDef(arg.count == most, arg.types),
    );
  }

  return args;
}

function remapLSLArgType(
  type: SLuaBaseType,
): SeleneArgDefType {
  if (type) {
    switch (type) {
      case "any":
      case "number":
      case "string":
      case "nil":
        return type;
      case "{}":
        return "table";
      case "integer":
        return "number";
      case "list":
        return "table";
      case "uuid":
        return "string";
      case "boolean":
        return "bool";
      case "quaternion":
        return { display: "Quaternion" };
      case "()":
        return "nil";
      case "self":
        return "any";
      default:
        if (typeof type == "string") {
          return { display: type };
        } else if (isTypeCustom(type)) {
          return { display: type.custom };
        } else if (isTypeValue(type)) {
          if (type.value === "true" || type.value === "false") {
            return "bool";
          }
          return { display: type.value };
        } else {
          throw new Error("Unhandled Type");
        }
    }
  }
  return "nil";
}
