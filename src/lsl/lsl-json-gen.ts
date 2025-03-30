import { isMap, Map, Node } from "../xml/types.ts";
import { readKeywordsXML } from "../xml/readKeywordXML.ts";
import {
  ConstDefs,
  EventDefs,
  FuncArgs,
  FuncDefs,
  StrObj,
  TypeDefs,
} from "../types.d.ts";
import { isStrObj as _isStrObj } from "../util.ts";
import _overrides from "../../data/lsl_keywords.overrides.json" with {
  type: "json",
};

type Override = {
  key: (string | number)[];
  value: string | number | boolean;
};
type Overrides = Override[];

const Overides = _overrides as Overrides;
export type LSLDef = {
  functions: FuncDefs;
  constants: ConstDefs;
  events: EventDefs;
  types: TypeDefs;
};

export async function buildLSLJson(file: string): Promise<LSLDef> {
  const map = await readKeywordsXML(file);
  const lsl = {
    functions: generateFunctions(map.get("functions") as Map),
    constants: generateConstants(map.get("constants") as Map),
    events: generateEvents(map.get("events") as Map),
    types: generateTypes(map.get("types") as Map),
  };

  applyPatches(lsl);

  return lsl;
}

function applyPatches(lsl: LSLDef): void {
  for (const override of Overides) {
    applyPatch(override, lsl);
  }
}

function applyPatch(patch: Override, lsl: LSLDef): void {
  let obj: StrObj<unknown> | unknown[] | unknown = lsl;
  const path = [...patch.key].reverse();

  const err = new Error(
    `Path hit non indexable point, patch ${JSON.stringify(patch.key)}`,
  );

  while (path.length > 1) {
    const key = path.pop() as string | number;
    if (typeof key == "number" && isArray(obj, patch)) {
      obj = obj[key];
    } else if (typeof key == "string" && isStrObj(obj, patch)) {
      obj = obj[key];
    } else {
      throw err;
    }
  }

  const key = path.pop();
  if (typeof key == "number" && isArray(obj, patch)) {
    obj[key] = patch.value;
  } else if (typeof key == "string" && isStrObj(obj, patch)) {
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

function isStrObj(
  obj: unknown,
  patch: Override,
): obj is StrObj<unknown> {
  if (!_isStrObj(obj)) {
    throw new Error(
      `Indexing StrObj with non string path ${JSON.stringify(patch)}`,
    );
  }
  return true;
}

function generateFunctions(funcs: Map): FuncDefs {
  const out: FuncDefs = {};

  for (const entry of funcs.content) {
    const [name, map] = entry;
    if (!isMap(map)) continue;

    out[name] = {
      def: "func",
      name,
      args: generateFuncArguments(map.get("arguments")),
      result: map.get("return")?.text ?? "void",
      desc: map.get("tooltip")?.text ?? "",
      energy: parseInt(map.get("energy")?.text ?? "10"),
      sleep: parseInt(map.get("sleep")?.text ?? "0"),
      pure: !hasSideEffect(name),
      link: `https://wiki.secondlife.com/wiki/${
        name.substring(0, 1).toUpperCase()
      }${name.substring(1)}`,
    };
  }

  return out;
}

function generateFuncArguments(args: Node | null): FuncArgs {
  const out: FuncArgs = [];
  if (args && args.type == "array") {
    for (const argMap of args.children) {
      if (!isMap(argMap)) continue;
      if (argMap.content.length > 1) {
        console.warn(argMap.toString(), "LONG");
        continue;
      }
      for (const arg of argMap.content) {
        const [name, map] = arg;
        if (!isMap(map)) continue;
        out.push(
          {
            def: "arg",
            name,
            desc: map.get("tooltip")?.text ?? "",
            type: map.get("type")?.text ?? "n/a",
          },
        );
      }
    }
  }
  return out;
}

function generateConstants(consts: Map): ConstDefs {
  const out: ConstDefs = {};
  for (const entry of consts.content) {
    const [name, map] = entry;
    if (!isMap(map)) continue;
    if (name == "default") continue;

    const type = map.get("type")?.text ?? "void";
    const value = map.get("value")?.text ?? "";
    const isNum = type === "integer" || type === "float";
    const numValue = type == "float" ? parseFloat(value) : parseInt(value);

    out[name] = {
      def: "const",
      name,
      valueRaw: value,
      value: isNum ? (!isNaN(numValue) ? numValue : null) : value,
      type: type,
      desc: map.get("tooltip")?.text ?? "",
      link: `https://wiki.secondlife.com/wiki/${name}`,
    };
  }
  return out;
}

function generateEvents(events: Map): EventDefs {
  const out: EventDefs = {};

  for (const entry of events.content) {
    const [name, map] = entry;
    if (!isMap(map)) continue;

    out[name] = {
      def: "event",
      name,
      args: generateFuncArguments(map.get("arguments")),
      desc: map.get("tooltip")?.text ?? "",
      link: `https://wiki.secondlife.com/wiki/${
        name.substring(0, 1).toUpperCase()
      }${name.substring(1)}`,
    };
  }

  return out;
}

function generateTypes(types: Map): TypeDefs {
  const out: TypeDefs = {};
  for (const entry of types.content) {
    const [name, map] = entry;
    if (!isMap(map)) continue;

    out[name] = {
      name,
      desc: map.get("tooltip")?.text ?? "",
    };
  }
  return out;
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
