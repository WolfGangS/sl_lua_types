import { isMap, Map, Node } from "./common.ts";
import _FunctionData from "../data/functionData.json" with { type: "json" };

type FuncData = { [k: string]: { sideEffect: boolean } };
const FunctionData = _FunctionData as FuncData;

type LSLDef = {
  functions: FuncDefs;
  constants: ConstDefs;
  events: EventDefs;
  types: TypeDefs;
};

export function buildJson(map: Map) {
  const json: LSLDef = {
    functions: generateFunctions(map.get("functions") as Map),
    constants: generateConstants(map.get("constants") as Map),
    events: generateEvents(map.get("events") as Map),
    types: generateTypes(map.get("types") as Map),
  };
  console.log(JSON.stringify(json, null, 2));
}

type StrObj<T> = { [k: string]: T };

type FuncDefs = StrObj<FuncDef>;
type FuncDef = {
  name: string;
  args: FuncArgs;
  return: string | null;
  desc: string;
  energy: number;
  sleep: number;
  pure: boolean;
};
type FuncArgs = FuncArg[];
type FuncArg = {
  name: string;
  type: string | null;
  desc: string;
};

function generateFunctions(funcs: Map): FuncDefs {
  const out: FuncDefs = {};

  for (const entry of funcs.content) {
    const [name, map] = entry;
    if (!isMap(map)) continue;

    const pure = !(FunctionData[name]?.sideEffect ?? true);

    out[name] = {
      name,
      args: generateFuncArguments(map.get("arguments")),
      "return": map.get("return")?.text ?? "void",
      desc: map.get("tooltip")?.text ?? "",
      energy: parseInt(map.get("energy")?.text ?? "10"),
      sleep: parseInt(map.get("sleep")?.text ?? "0"),
      pure,
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

type ConstDef = {
  name: string;
  type: string | null;
  valueRaw: string | null;
  value: number | string | null;
  desc: string;
};
type ConstDefs = StrObj<ConstDef>;

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
      name,
      valueRaw: value,
      value: isNum ? (!isNaN(numValue) ? numValue : null) : value,
      type: type,
      desc: map.get("tooltip")?.text ?? "",
    };
  }
  return out;
}

type EventDefs = StrObj<EventDef>;
type EventDef = {
  name: string;
  args: FuncArgs;
  desc: string;
};

function generateEvents(events: Map): EventDefs {
  const out: EventDefs = {};

  for (const entry of events.content) {
    const [name, map] = entry;
    if (!isMap(map)) continue;

    out[name] = {
      name,
      args: generateFuncArguments(map.get("arguments")),
      desc: map.get("tooltip")?.text ?? "",
    };
  }

  return out;
}

type TypeDefs = StrObj<TypeDef>;
type TypeDef = {
  name: string;
  desc: string;
};

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
