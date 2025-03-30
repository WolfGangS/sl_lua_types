import {
  buildSluaJson,
  //   SLuaClassDef,
  SLuaConstDef,
  SLuaEventDef,
  SLuaFuncDef,
  SLuaFuncSig,
  SLuaGlobal,
  SLuaGlobalTable,
  SLuaGlobalTableProps,
  SLuaType,
} from "./slua-json-gen.ts";
import { StrObj } from "../types.d.ts";
import { generateCodeSample } from "./slua-common.ts";

type Doc = {
  documentation: string;
  learn_more_link?: string;
  code_sample?: string;
  returns?: string;
};

type Docs = StrObj<Doc>;

const prefix = "@roblox";

export async function buildSluaDocs(
  file: string,
  strict: boolean = true,
): Promise<Docs> {
  const data = await buildSluaJson(file, strict);
  const docs: Docs = {
    [`${prefix}/global/ll`]: {
      documentation:
        "The global LL object that stored all the ll specific functions",
      learn_more_link:
        "https://wiki.secondlife.com/wiki/Category:LSL_Functions",
      code_sample: "ll.Foo(...)",
    },
    [`${prefix}/global/integer`]: {
      documentation:
        "function that returns an LL integer type for a given number",
      learn_more_link:
        "https://wiki.secondlife.com/wiki/SLua_Alpha#Transitioning_from_LSL_to_SLua",
      code_sample: "integer(123)",
    },
    [`${prefix}/global/quaternion`]: {
      documentation: "function to create an LL quaternion value from 4 numbers",
      learn_more_link:
        "https://wiki.secondlife.com/wiki/SLua_Alpha#Transitioning_from_LSL_to_SLua",
      code_sample: "quaternion(0,0,0,1)",
    },
    [`${prefix}/global/uuid`]: {
      documentation: "function to create an LL UUID value from a string",
      learn_more_link:
        "https://wiki.secondlife.com/wiki/SLua_Alpha#Transitioning_from_LSL_to_SLua",
      code_sample: "uuid('677bf9a4-bba5-4cf9-a4ad-4802a0f7ef46')",
    },
  };

  outputGlobals(data.global, docs);
  //   outputClasses(data.classes, docs);

  return docs;
}

// function outputClasses(classes: StrObj<SLuaClassDef>, docs: Docs) {
//   for (const key in classes) {
//     const cls = classes[key];
//     outputClass(cls, docs);
//   }
// }

// function outputClass(cls: SLuaClassDef, globalDocs: Docs) {
//   const docs: Docs = {};
//   let out = false;
//   for (const fkey in cls.funcs) {
//     const func = cls.funcs[fkey];
//     if (func.name.startsWith("__")) continue;
//     outputFuncDoc(func, docs, `${cls.name}.`);
//     out = true;
//   }
//   for (const pkey in cls.props) {
//     const prop = cls.props[pkey];
//     outputConstDoc(prop, docs, `${cls.name}.`);
//     out = true;
//   }
//   if (out) {
//     for (const key in docs) {
//       globalDocs[key] = docs[key];
//     }
//   }
// }

function outputGlobals(
  data: SLuaGlobal | SLuaGlobalTableProps,
  docs: Docs,
  section: string[] = [],
) {
  for (const key in data) {
    const entry = data[key];
    switch (entry.def ?? null) {
      case "class":
        break;
      case "event": {
        outputEventDoc(entry as SLuaEventDef, docs, section);
        break;
      }
      case "const": {
        outputConstDoc(entry as SLuaConstDef, docs, section);
        break;
      }
      case "func": {
        const func = entry as SLuaFuncDef;
        outputFuncDoc(func, docs, section);
        break;
      }
      case "table": {
        const table = entry as SLuaGlobalTable;
        outputTable(`${section}${table.name}`, docs);
        outputGlobals(table.props, docs, [...section, table.name]);
        break;
      }
      default:
        console.error(entry);
        throw "WHAT EVEN AM I?";
    }
  }
}

function outputTable(name: string, docs: Docs) {
  if (name == "ll") return;
  docs[`${prefix}/global/${name}`] = {
    documentation: `Global table ${name}`,
  };
}

function outputEventDoc(
  event: SLuaEventDef,
  docs: Docs,
  section: string[] = [],
) {
  docs[`${prefix}/global/${[...section, name].join(".")}`] = {
    documentation: event.desc || "n./a",
    learn_more_link: event.link,
  };
}

function outputConstDoc(
  con: SLuaConstDef,
  docs: Docs,
  section: string[] = [],
) {
  docs[`${prefix}/global/${[...section, name].join(".")}`] = {
    documentation: con.value + " : " + (con.desc || "n/a"),
    learn_more_link: con.link,
    code_sample: name,
    //returns: (map.get("value")?.text ?? ""),
  };
}

function outputFuncDoc(
  func: SLuaFuncDef,
  docs: Docs,
  section: string[] = [],
) {
  docs[`${prefix}/global/${section}${func.name}`] = {
    documentation: func.desc || "n./a",
    learn_more_link: func.link,
    code_sample: generateCodeSample(section, func, 0),
  };
}
