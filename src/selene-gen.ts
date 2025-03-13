import { isMap, Map, Node } from "./common.ts";
import { stringify } from "jsr:@std/yaml";
import FunctionData from "../data/functionData.json" with { type: "json" };

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
      quaternion: {
        args: [
          { required: true, type: "number", observes: "read" },
          { required: true, type: "number", observes: "read" },
          { required: true, type: "number", observes: "read" },
          { required: true, type: "number", observes: "read" },
        ],
        must_use: true,
      },
      integer: {
        args: [
          { required: true, type: "number", observes: "read" },
        ],
        must_use: true,
      },
      uuid: {
        args: [
          { required: true, type: "string", observes: "read" },
        ],
        must_use: true,
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

function mustUseFunc(name: string, result: string): boolean {
  if (result == "void") return false;
  const data: { sideEffect: boolean } | null = FunctionData[name] ?? null;
  if (data) {
    return !data.sideEffect;
  }
  return false;
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

export function listSideEffects(map: Map) {
  const functionData: { [k: string]: { sideEffect: boolean } } = {};

  for (const func of (map.get("functions") as Map).content) {
    const [name, map] = func;
    if (!isMap(map)) continue;
    functionData[name] = {
      sideEffect: hasSideEffect(name),
    };
  }

  console.log(JSON.stringify(functionData, null, 2));
}

function hasSideEffect(name: string): boolean {
  const knownSideEffects = [
    "llForceMouselook",
    "llGetNextEmail",
    "llGroundRepel",
    "llDeleteCharacter",
    "llHttpResponse",
    "llMinEventDelay",
    "llModifLand",
    "llNavigateTo",
    "llOffsetTexture",
    "llParcelMediaCommandList",
    "llPursue",
    "llPushObject",
    "llWhisper",
    "llShout",
    "llScaleByFactor",
    "llScaleTexture",
    "llScriptProfiler",
    "llSitOnLink",
    "llSleep",
    "llStartAnimation",
    "llStartObjectAnimation",
    "llDialog",
    "llTextBox",
    "llUnSit",
    "llVolumeDetect",
    "llWanderWithin",
  ];

  const knonwPure: string[] = [
    "llAvatarOnLinkSitTarget",
    "llAvatarOnSitTarget",
    "llGetExperienceErrorMessage",
    "llGetEnvironment",
  ];

  const sideEfectKeyWords = [
    "Set",
    "Say",
    "Request",
    "Write",
    "Reset",
    "Particle",
    "Add",
    "Adjust",
    "Apply",
    "AttachTo",
    "Clear",
    "Sound",
    "Notecard",
    "Give",
    "KeyValue",
    "LinksetDataDelete",
    "LinksetDataWrite",
    "Target",
    "Listen",
    "Load",
    "Manage",
    "Map",
    "Message",
    "Pass",
    "Release",
    "Remove",
    "Return",
    "Environment",
    "RezObject",
    "RezAt",
    "Rotate",
    "LookAt",
    "Sensor",
    "Stop",
    "Controls",
    "Teleport",
    "Transfer",
    "Trigger",
    "Update",
  ];

  if (knonwPure.includes(name)) return false;
  for (const key of sideEfectKeyWords) {
    if (name.indexOf(key) > 0) return true;
  }
  if (knownSideEffects.includes(name)) return true;

  return false;
}
