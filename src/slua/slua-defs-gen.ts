import {
    buildSluaJson,
    SLuaClassDef,
    SLuaClassType,
    SLuaConstDef,
    SLuaFuncDef,
    SLuaFuncSig,
    SLuaGlobalTable,
    SLuaGlobalTableProps,
    SLuaJsonOptions,
    SLuaTableType,
    SLuaTypeDef,
} from "./slua-json-gen.ts";
import { StrObj } from "../types.d.ts";
import {
    mapArgToFunctionString,
    mapResultToFunctionString,
    mapSLuaTypeToString,
} from "./slua-common.ts";
import { LSLDef } from "../xml/xml-lsl-json-gen.ts";

export async function buildSluaTypeDefs(
    lsl: LSLDef,
    options: SLuaJsonOptions = {},
): Promise<string> {
    const data = await buildSluaJson(lsl, options);

    return "\n" +
        "----------------------------------\n" +
        "---------- LSL LUAU DEFS ---------\n" +
        "----------------------------------\n" +
        "\n" +
        outputTypeDefs(data.types) +
        "\n\n" +
        outpufClassDefs(data.classes) +
        "\n\n" +
        outputFunctionDefs(data.global.props);
}

function outpufClassDefs(classes: StrObj<SLuaClassDef>): string {
    let output = "";
    for (const key in classes) {
        const cls = classes[key];
        output += `declare class ${cls.name}\n`;
        for (const pkey in cls.props) {
            const prop = cls.props[pkey];
            if (prop.type instanceof Array) {
                console.error(
                    "Not implemented handling array prop types",
                    cls,
                    prop,
                );
                throw "Not implemented handling array prop types";
            }
            output += `  ${prop.name} : ${prop.type.value}`;
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

function outputTypeDefs(typeDefs: StrObj<SLuaTypeDef>): string {
    const output: string[] = [];
    for (const key in typeDefs) {
        const def = typeDefs[key];
        const typeArray = def.type instanceof Array;
        const types = def.type instanceof Array ? def.type : [def.type];
        const typeStrs: string[] = [];
        for (const typ of types) {
            switch (typ.def) {
                case "simple":
                case "custom":
                case "value":
                    typeStrs.push(typ.value.toString());
                    break;
                case "class":
                    if (typeArray) throw `Cannot output type class array`;
                    typeStrs.push(outputClassType(typ));
                    break;
                case "table":
                    typeStrs.push(outputTableType(typ));
                    break;
                case "function":
                    typeStrs.push(outputFunctionSiganture(typ.value));
                    break;
                default:
                    console.error(`Unhandled type def type`, typ);
                    throw `Unhandled type def type`;
            }
        }
        // switch(typ.type.def)
        // if (typeof typ.type == "string") {
        //     out += `${typ.type}`;
        // } else {

        // }
        output.push(`type ${def.name} = ` + typeStrs.join("|"));
    }
    return output.join("\n") + "\n";
}

function outputTableType(table: SLuaTableType): string {
    const str: string[] = [];

    for (const type of table.value) {
        switch (type.def) {
            case "simple":
            case "custom":
            case "value":
                str.push(type.value.toString());
                break;
            case "class":
                str.push(type.value.name);
                break;
            default:
                console.error(table, type);
                throw `Unhandled type for table ouput '${type.def}'`;
        }
    }

    return `{${str.join("|")}}`;
}

function outputClassType(typ: SLuaClassType): string {
    const funcs: string[] = [];
    const props: string[] = [];
    for (const name in typ.value.props) {
        const prop = typ.value.props[name];
        if (prop.type instanceof Array) {
            console.error(
                "Not implemented handling array prop types",
                typ,
                prop,
            );
            throw "Not implemented handling array prop types";
        }
        props.push(`  ${prop.name} : ${prop.type.value},`);
    }
    if (props.length) props.push("");
    for (const name in typ.value.funcs) {
        const func = typ.value.funcs[name];
        const results = func.signatures.map((result) => {
            const args = result.args.map(mapArgToFunctionString);
            return `(${args.join(", ")}) -> ${
                mapResultToFunctionString(result.result)
            }`;
        });
        let resultStr = results.length > 1 ? "(" : "";
        resultStr += results.join(") & (");
        resultStr += results.length > 1 ? ")" : "";
        funcs.push(`  ${func.name} : ${resultStr},`);
    }
    return `{\n${props.join("\n")}${funcs.join("\n")}\n}`;
}

function outputFunctionSiganture(
    sig: SLuaFuncSig,
    colon: boolean = false,
): string {
    const args: string[] = sig.args.map(mapArgToFunctionString);
    const result: string = mapResultToFunctionString(sig.result);
    return `(${args.join(", ")})${colon ? ":" : " ->"} ${result}`;
}

function outputFunctionDefs(
    funcs: SLuaGlobalTableProps,
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
                output += `${pre}${con.name} : ${
                    mapSLuaTypeToString(con.type)
                }${suf}`;
                output += " -- " + con.desc.replaceAll("\n", " ");
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
                }${results.join(") & (")}${
                    results.length > 1 ? ")" : ""
                }${suf}`;
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
