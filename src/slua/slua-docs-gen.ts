import {
    buildSluaJson,
    SLua,
    //   SLuaClassDef,
    SLuaConstDef,
    SLuaFuncDef,
    SLuaGlobalTable,
    SLuaGlobalTableProps,
    SLuaJsonOptions,
} from "./slua-json-gen.ts";
import { StrObj } from "../types.d.ts";
import { generateCodeSample } from "./slua-common.ts";
import { LSLDef } from "../xml/xml-lsl-json-gen.ts";

type Doc = {
    documentation: string;
    learn_more_link?: string;
    code_sample?: string;
    returns?: string;
};

type Docs = StrObj<Doc>;

const prefix = "@roblox";

export async function buildSluaDocs(
    lsl: LSLDef,
    options: SLuaJsonOptions = {},
): Promise<Docs> {
    const data = await buildSluaJson(lsl, options);
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
            documentation:
                "function to create an LL quaternion value from 4 numbers",
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

    outputGlobals(data.global.props, docs, [], data);
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
    data: SLuaGlobalTableProps,
    docs: Docs,
    section: string[] = [],
    slua: SLua,
) {
    for (const key in data) {
        const entry = data[key];
        switch (entry.def ?? null) {
            case "class":
                break;
            case "const": {
                outputConstDoc(entry as SLuaConstDef, docs, section);
                break;
            }
            case "func": {
                outputFuncDoc(entry as SLuaFuncDef, docs, section, slua);
                break;
            }
            case "table": {
                const table = entry as SLuaGlobalTable;
                outputTable(`${section}${table.name}`, docs);
                outputGlobals(
                    table.props,
                    docs,
                    [...section, table.name],
                    slua,
                );
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

function outputConstDoc(
    con: SLuaConstDef,
    docs: Docs,
    section: string[] = [],
) {
    docs[`${prefix}/global/${[...section, con.name].join(".")}`] = {
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
    slua: SLua,
) {
    const doc: Doc = {
        documentation: func.desc || "n./a",
        code_sample: generateCodeSample(section, func, 0, slua),
    };
    if (func.link) {
        doc.learn_more_link = func.link;
    }
    docs[
        `${prefix}/global/${[...section, func.name].join(".")}`
    ] = doc;
}
