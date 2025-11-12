import { stringify } from "@std/yaml";
import {
    buildSluaJson,
    SLua,
    SLuaBaseType,
    SLuaConstDef,
    SLuaCustomType,
    SLuaFuncDef,
    SLuaFuncSig,
    SLuaGlobalTable,
    SLuaGlobalTableProps,
    SLuaJsonOptions,
    SLuaSimpleType,
    SLuaTypeDef,
    VarOpType,
} from "./slua-json-gen.ts";
import { isTypeCustom, isTypeFunction, isTypeValue } from "./slua-common.ts";
import { StrObj } from "../types.d.ts";
import { LSLDef } from "../xml/xml-lsl-json-gen.ts";

type SeleneDef = SelenePropDef | SeleneFuncDef | SeleneStructDef;

type SelenePropDef = {
    property: "read-only" | "new-fields" | "override-fields" | "full-write";
};

type SeleneStructDef = {
    struct: string;
};

type SeleneFuncDef = {
    args?: SeleneArgDef[];
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
    | string[]
    | { display: string };

type SeleneStructFunc = {
    args: SeleneArgDef[];
    method: true;
    must_use: boolean;
};

type SeleneStructProp = SelenePropDef;

type SeleneStructItem = SeleneStructFunc | SeleneStructProp;

type SeleneStruct = { [k: string]: SeleneStructItem };
type SeleneStructs = { [k: string]: SeleneStruct };

type Selene = {
    base: string;
    name: string;
    globals: SeleneGlobals;
    structs: SeleneStructs;
};

type SeleneGlobals = { [k: string]: SeleneDef };

export async function buildSluaSelene(
    lsl: LSLDef,
    options: SLuaJsonOptions = {},
): Promise<string> {
    const data = await buildSluaJson(lsl, options);
    const selene: Selene = {
        base: "luau",
        name: "sl_selene_defs",
        globals: {},
        structs: {},
    };

    outputSluaGlobals(data.global.props, data.types, selene.globals, "");
    outputSluaStructs(data.types, selene.structs);
    return stringify(selene);
}

function outputSluaStructs(
    types: StrObj<SLuaTypeDef>,
    structs: SeleneStructs,
) {
    for (const name in types) {
        const type = types[name];
        if (type.type instanceof Array) continue;
        if (type.type.def != "class") continue;
        const cls = type.type.value;
        const struct: SeleneStruct = {};
        for (const fName in cls.funcs) {
            const func = cls.funcs[fName];
            console.error("=============", fName, "=============");
            const sFunc: SeleneStructFunc = {
                method: true,
                must_use: func.must_use,
                args: buildFuncArgs(func.signatures, types, true),
            };
            console.error("=============", "       ", "=============");
            struct[fName] = sFunc;
        }
        structs[name] = struct;
    }
}

function outputSluaGlobals(
    data: SLuaGlobalTableProps,
    types: StrObj<SLuaTypeDef>,
    selene: SeleneGlobals,
    section: string,
): void {
    for (const key in data) {
        const entry = data[key];
        switch (entry.def) {
            case "class": {
                break;
            }
            case "const": {
                outputSluaConst(
                    entry as SLuaConstDef,
                    types,
                    selene,
                    section,
                );
                break;
            }
            case "func": {
                outputSluaFunc(entry as SLuaFuncDef, selene, types, section);
                break;
            }
            case "table": {
                const table = entry as SLuaGlobalTable;
                selene[`${section}${table.name}`] = {
                    property: section == "" ? "full-write" : "read-only",
                };
                outputSluaGlobals(
                    table.props,
                    types,
                    selene,
                    `${section}${table.name}.`,
                );
                break;
            }
            default:
                console.error(entry);
                throw "WHAT EVEN AM I?";
        }
    }
}

function outputSluaTypes(
    types: StrObj<SLuaTypeDef>,
    selene: SeleneGlobals,
    section: string = "",
) {
    for (const key in types) {
        const type = types[key];
        if (typeof (type.type) == "string") continue;
        const funcs = type.type.funcs;
        for (const fKey in funcs) {
            const func = funcs[fKey];
            outputSluaFunc(func, selene, types, `${section}${type.name}.`);
        }
    }
}

function outputSluaConst(
    con: SLuaConstDef,
    types: StrObj<SLuaTypeDef>,
    selene: SeleneGlobals,
    section: string,
) {
    if (con.type.def == "custom") {
        const type = types[con.type.value];
        if (type && !(type.type instanceof Array) && type.type.def == "class") {
            selene[`${section}${con.name}`] = { struct: con.type.value };
            return;
        }
    }
    selene[`${section}${con.name}`] = { property: "read-only" };
    if (con.type.def != "custom" && con.type.def != "simple") return;
    const typeName = con.type.value;
    if (!types[typeName]) return;
    const type = types[typeName];
    if (typeof (type.type) == "string") return;
    const funcs = type.type.funcs;
    for (const fKey in funcs) {
        const func = funcs[fKey];
        outputSluaFunc(func, selene, types, `${section}${con.name}.`);
    }
}

function outputSluaFunc(
    func: SLuaFuncDef,
    globals: SeleneGlobals,
    types: StrObj<SLuaTypeDef>,
    section: string,
) {
    const args = buildFuncArgs(func.signatures, types);
    const sfunc: SeleneFuncDef = {
        must_use: func.must_use,
        args,
    };
    // if (args.length) {
    //   sfunc["args"] = args;
    // }
    globals[`${section}${func.name}`] = sfunc;
}

function castSluaArgTypesToSelene(
    stypes: SLuaBaseType[],
    types: StrObj<SLuaTypeDef>,
): SeleneArgDefType[] {
    const args: SeleneArgDefType[] = [];
    for (const type of stypes) {
        args.push(remapSLuaArgType(type, types));
    }
    return args;
}

function castVarOpToSelene(
    argTypes: VarOpType[],
    types: StrObj<SLuaTypeDef>,
): SeleneArgDefType | SeleneArgDefType[] {
    let args: SeleneArgDefType[] = [];

    for (const vtype of argTypes) {
        if (vtype.variadic) args.push("...");
        else {
            args = [...args, ...castSluaArgTypesToSelene(vtype.type, types)];
        }
    }
    console.error("----------------------------------------");
    console.error(args);
    console.error("----------------------------------------");

    if (isStringArrayArray(args)) {
        args = args.flat();
    }

    args = [...new Set(args)];

    if (args.length > 1) args = args.filter((a) => typeof a == "string");

    if (args.length == 1) return args[0];
    else return args;
}

function newArgDef(
    required: boolean,
    argTypes: VarOpType[],
    types: StrObj<SLuaTypeDef>,
): SeleneArgDef {
    return {
        required,
        observes: "read",
        type: castVarOpToSelene(argTypes, types),
    };
}

function buildFuncArgs(
    signatures: SLuaFuncSig[],
    types: StrObj<SLuaTypeDef>,
    noSelf: boolean = false,
): SeleneArgDef[] {
    const argSet: { count: number; types: VarOpType[]; required: boolean }[] =
        [];

    let most = 0;
    for (const sig of signatures) {
        const args = [...sig.args];
        if (args[0] && args[0].name == "self" && noSelf) {
            args.shift();
        }
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
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
        const nd = newArgDef(arg.count == most, arg.types, types);
        if (noSelf && nd.type instanceof Array && nd.type.length == 0) {
            console.error(arg, nd);
        }
        args.push(nd);
    }

    return args;
}

function isStringArray(val: unknown): val is string[] {
    if (!(val instanceof Array)) return false;
    return !val.some((s) => typeof s != "string");
}
function isArrayArray(val: unknown): val is unknown[][] {
    if (!(val instanceof Array)) return false;
    return !val.some((s) => !(s instanceof Array));
}
function isStringArrayArray(val: unknown): val is string[][] {
    if (!(val instanceof Array)) return false;
    return !val.some((s) => !isStringArray(s));
}

function remapSLuaArgType(
    type: SLuaBaseType,
    types: StrObj<SLuaTypeDef>,
): SeleneArgDefType {
    //console.error(type);
    if (type) {
        switch (type.def) {
            case "simple":
                return remapSimpleSLuaArgType(type);
            case "value":
                if (type.value === "true" || type.value === "false") {
                    return "bool";
                }
                if (
                    typeof (type.value) == "string" &&
                    type.value.startsWith('"') && type.value.endsWith('"')
                ) {
                    return [type.value.slice(1).slice(0, -1)];
                }
                return { display: type.value.toString() };
            case "custom":
                return remapCustomArgType(type, types);
            case "function":
                return "function";
            default:
                console.error(type);
                throw new Error("Unhandled Type");
        }
    }
    return "nil";
}

function remapCustomArgType(
    custom: SLuaCustomType,
    types: StrObj<SLuaTypeDef>,
): SeleneArgDefType {
    const typ = types[custom.value];
    if (typ) {
        let type = typ.type;
        if (!(type instanceof Array)) type = [type];
        const sTypes = castSluaArgTypesToSelene(type, types);
        if (sTypes.length == 1) {
            return sTypes[0];
        } else if (isArrayArray(sTypes)) {
            return sTypes.reduce((ac, c) => [...ac, ...c], []);
        } else {
            console.error(sTypes);
            throw "MULTI TYPE";
        }
    } else {
        return { display: custom.value };
    }
}

function remapSimpleSLuaArgType(type: SLuaSimpleType): SeleneArgDefType {
    switch (type.value) {
        case "any":
        case "number":
        case "string":
        case "nil":
            return type.value;
        case "{}":
            return "table";
        case "list":
            return "table";
        case "uuid":
            return "string";
        case "boolean":
            return "bool";
        case "quaternion":
            return { display: "Quaternion" };
        case "vector":
        case "buffer":
            return { display: type.value };
        case "()":
            return "nil";
        case "self":
            return "any";
        default:
            console.error(type);
            throw new Error("Unhandled Simple Type");
    }
}
