import {
  buildSluaJson,
  isTypeCustom,
  isTypeValue,
  NamedVarOpType,
  SLuaBaseType,
  SLuaClassDef,
  SLuaConstDef,
  SLuaEventDef,
  SLuaFuncDef,
  SLuaFuncResult,
  SLuaGlobal,
  SLuaGlobalTable,
  SLuaGlobalTableProps,
  SLuaTableDef,
  SLuaTypeDef,
} from "./slua-json-gen.ts";
import { StrObj } from "../types.d.ts";

export async function buildSluaTypeDefs(
  file: string,
  strict: boolean = true,
): Promise<string> {
  const data = await buildSluaJson(file, strict);

  return "\n" +
    "----------------------------------\n" +
    "---------- LSL LUAU DEFS ---------\n" +
    "----------------------------------\n" +
    "\n" +
    outputTypeDefs(data.types) +
    "\n\n" +
    outpufClassDefs(data.classes) +
    "\n\n" +
    outputFunctionDefs(data.global as SLuaTableDef);
}

function outpufClassDefs(classes: StrObj<SLuaClassDef>): string {
  let output = "";
  for (const key in classes) {
    const cls = classes[key];
    output += `declare class ${cls.name}\n`;
    for (const pkey in cls.props) {
      const prop = cls.props[pkey];
      output += `  ${prop.name} : ${prop.type}`;
      output += " -- " + prop.desc.replaceAll("\n", " ") + "\n";
    }
    for (const fkey in cls.funcs) {
      const func = cls.funcs[fkey];
      for (const result of func.signatures) {
        const args = result.args.map(mapArgToFunctionString);
        output += `  function ${func.name}(${args.join(", ")}): ${
          mapResultToFunctionString(result.result)
        }`;
        output += " -- " + func.desc.replaceAll("\n", " ") + "\n";
      }
    }
    output += "end\n\n";
  }
  return output;
}

function outputTypeDefs(types: StrObj<SLuaTypeDef>): string {
  let output = "";
  for (const key in types) {
    const typ = types[key];
    output += `type ${typ.name} = ${typ.type}\n`;
  }
  return output;
}

function outputFunctionDefs(
  funcs: SLuaGlobal | SLuaGlobalTableProps,
  depth: number = 0,
): string {
  let output = "";
  const pad = new Array((depth * 2) + 1).join(" ");
  const funcBe = depth > 0 ? "" : "function ";
  const funcAf = depth > 0 ? ": " : " ";
  const funcRes = depth > 0 ? " -> " : " : ";
  const pre = depth == 0 ? "declare " : pad;
  const suf = depth == 0 ? "" : ",";
  for (const key in funcs) {
    const entry = funcs[key];
    switch (entry.def ?? null) {
      case "const": {
        const con = entry as SLuaConstDef;
        output += `${pre}${con.name} : ${mapSLuaTypeToString(con.type)}${suf}`;
        output += " -- " + con.desc.replaceAll("\n", " ");
        break;
      }
      case "event": {
        const event = entry as SLuaEventDef;
        const args = event.args.map(mapArgToFunctionString);
        output += `${pre}${funcBe}${event.name}${funcAf}(${
          args.join(", ")
        }) : ()${suf}`;
        output += " -- " + event.desc.replaceAll("\n", " ");
        break;
      }
      case "func": {
        const func = entry as SLuaFuncDef;
        const results = func.signatures.map((result) => {
          const args = result.args.map(mapArgToFunctionString);
          return `(${args.join(", ")})${funcRes}${
            mapResultToFunctionString(result.result)
          }`;
        });
        output += `${pre}${funcBe}${func.name}${funcAf}${
          results.length > 1 ? "(" : ""
        }${results.join(") & (")}${results.length > 1 ? ")" : ""}${suf}`;
        output += " -- " + func.desc.replaceAll("\n", " ");
        break;
      }
      case "table": {
        const table = entry as SLuaGlobalTable;
        if (depth == 0) {
          output += "\n---------------------------\n";
          output += `-- Global Table: ${table.name}\n`;
          output += "---------------------------\n\n";
        }
        output += `${pre}${key}: {\n`;
        output += outputFunctionDefs(table.props, depth + 1).trimEnd()
          .split(
            "\n",
          ).sort().join("\n");
        output += `\n${pad}}`;
        if (depth == 0) output += "\n\n";
        break;
      }
      default:
        console.error(entry);
        throw "WTF WHAT EVEN AM I";
    }
    output += "\n";
  }
  return output;
}

function mapResultToFunctionString(results: SLuaFuncResult[]): string {
  return results.map(mapArgToFunctionString).join(", ");
}

function mapSLuaTypeToString(t: SLuaBaseType): string {
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

function mapArgToFunctionString(arg: NamedVarOpType): string {
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
