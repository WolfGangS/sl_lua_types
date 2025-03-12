import { isMap, Map, Node } from "./common.ts";
import { stringify } from "jsr:@std/yaml";

type SeleneDef = SelenePropDef | SeleneFuncDef;

type SelenePropDef = {
  property: "read-only" | "new-fields" | "override-fields" | "full-write";
};

type SeleneFuncDef = {
  args?: SeleneArgDef[];
  must_use?: boolean;
};

type SeleneArgDef = {
  required?: boolean;
  observes?: "read" | "write" | "read-write";
  type: SeleneArgDefType;
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

export function buildDefs(map: Map) {
  const selene: Selene = {
    base: "Luau",
    name: "sl_selene_defs",
    globals: {
      ll: {
        property: "read-only",
      },
    },
  };

  outputConstDefs(map.get("constants") as Map, selene.globals);
  outputFunctionDefs(map.get("functions") as Map, selene.globals);
  //outputEventDefs(map.get("events") as Map, selene.globals);
  console.log(stringify(selene));
}

function outputConstDefs(consts: Map, globals: SeleneGlobals) {
  for (const entry of consts.content) {
    const [name, map] = entry;
    if (!isMap(map)) continue;
    if (name == "default") continue;
    globals[name] = { property: "read-only" };
  }
}

function outputFunctionDefs(funcs: Map, globals: SeleneGlobals) {
  for (const entry of funcs.content) {
    const [name, map] = entry;
    if (!isMap(map)) continue;
    const result = map.get("return")?.text ?? "void";
    const args = buildFuncArgs(map.get("arguments"));
    globals["ll." + name.substring(2)] = {
      args,
      must_use: mustUseFunc(name, result),
    };
  }
}

function mustUseFunc(_name: string, result: string): boolean {
  return result != "void";
}

function buildFuncArgs(argArray: Node | null): SeleneArgDef[] {
  const args: SeleneArgDef[] = [];

  if (argArray && argArray.type == "array") {
    for (const argMap of argArray.children) {
      if (!isMap(argMap)) continue;
      if (argMap.content.length > 1) {
        console.warn(argMap.toString(), "ARG ARRAY LONG");
        continue;
      }
      for (const arg of argMap.content) {
        const [_name, map] = arg;
        if (!isMap(map)) continue;
        const type = remapLSLArgType(map.get("type")?.text);
        args.push({
          required: true,
          type: type,
          observes: "read",
        });
      }
    }
  }

  return args;
}

function remapLSLArgType(type: string | null | undefined): SeleneArgDefType {
  if (type) {
    switch (type) {
      case "integer":
      case "float":
        return "number";
      case "list":
        return "table";
      case "key":
      case "string":
        return "string";
      case "rotation":
        return { display: "Quaternion" };
      default:
        return { display: type };
    }
  }
  return "nil";
}
