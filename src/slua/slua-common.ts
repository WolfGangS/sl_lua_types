import {
    NamedVarOpType,
    SLua,
    SLuaBaseType,
    SLuaClassDef,
    SLuaCustomType,
    SLuaFuncArg,
    SLuaFuncArgs,
    SLuaFuncDef,
    SLuaFuncResult,
    SLuaFuncSig,
    SLuaFunctionType,
    SLuaGlobalTable,
    SLuaSimpleType,
    SLuaSimpleTypeValue,
    SLuaTableDef,
    SLuaType,
    SLuaValueType,
} from "./slua-json-gen.ts";

export function mapResultToFunctionString(results: SLuaFuncResult[]): string {
    return results.map((r) => mapArgToFunctionString(r)).join(", ");
}

export function mapSLuaTypeToString(t: SLuaBaseType): string {
    switch (t.def) {
        case "custom":
        case "value":
        case "simple":
            return t.value.toString();
        case "function":
            return "(...any)->()"; // TODO : make function more correct
        case "table":
            return `{ ${t.value.map((e) => e.value)} }`;
        default:
            console.error("Unknown type", t);
            throw "Unknown type for mapSLuaTypeToString";
    }
}

function addIfArrayNotContainJson<T>(accum: T[], add: T[]): void {
    const matchJSON = (t: T) => {
        const json = JSON.stringify(t);
        return (v: T) => JSON.stringify(v) == json;
    };
    for (const t of add) {
        if (!accum.some(matchJSON(t))) {
            accum.push(t);
        }
    }
}

export function generateStringDefinitions(ofunc: SLuaFuncDef): string[] {
    return ofunc.signatures.map((sig) => {
        return `(${mapArgsToFunctionParamString(sig.args, true)}) -> ${
            mapResultToFunctionString(sig.result)
        }`;
    });
}

export function mapArgsToFunctionParamString(
    args: NamedVarOpType[],
    cleanup: boolean = false,
): string {
    return args.map((a) => doMapArgToFunctionString(a, cleanup)).join(", ");
}

export function mapArgToFunctionString(
    arg: NamedVarOpType,
): string {
    return doMapArgToFunctionString(arg, false);
}

function doMapArgToFunctionString(
    arg: NamedVarOpType,
    cleanup: boolean = false,
): string {
    const types = (cleanup ? cleanTypes(arg.type) : arg.type).map(
        mapSLuaTypeToString,
    );

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

export function classDefToTableDef(
    cls: SLuaClassDef,
    name?: string,
): SLuaGlobalTable {
    return {
        def: "table",
        name: name || cls.name,
        props: {
            ...cls.props,
            ...cls.funcs,
        },
    };
}

function isDefObj(c: unknown): c is { def: string } {
    if (typeof c != "object") return false;
    if (c == null) return false;
    if (c instanceof Array) return false;
    return Object.hasOwn(c, "def");
}

function isType(c: unknown): c is { def: string; value: unknown } {
    if (!isDefObj(c)) return false;
    return Object.hasOwn(c, "value");
}

export function isTypeFunction(
    c: unknown,
): c is SLuaFunctionType {
    if (!isType(c)) return false;
    if (c.def != "function") return false;
    if (!isDefObj(c.value)) return false;
    return c.value.def == "signature";
}

export function isTypeCustom(
    c: unknown,
): c is SLuaCustomType {
    if (!isType(c)) return false;
    return c.def == "custom" && typeof (c.value) == "string";
}

export function isTypeValue(c: unknown): c is SLuaValueType {
    if (!isType(c)) return false;
    return c.def == "value" &&
        (typeof (c.value) == "string" || typeof (c.value) == "number");
}

export function isTypeSimple(
    c: unknown,
): c is SLuaSimpleType {
    if (!isType(c)) return false;
    return c.def == "simple" && typeof (c.value) == "string" &&
        isSimpleTypeValue(c.value);
}

export function isSimpleTypeValue(s: string): s is SLuaSimpleTypeValue {
    return [
        "string",
        "boolean",
        "number",
        "vector",
        "buffer",
        "{}",
        "quaternion",
        "uuid",
        "nil",
        "list",
        "self",
        "any",
        "()",
        "numeric",
    ].includes(s);
}

export function generatePreferedCodeSample(
    prefix: string[],
    func: SLuaFuncDef,
    slua: SLua,
): [string, number] {
    let str = generateCodeSample(
        prefix,
        func,
        0,
        slua,
        0,
        func.signatures[0].args.length > 3,
    );
    let sigIndex = 0;
    let args = func.signatures[0].args.length;
    for (let i = 1; i < func.signatures.length; i++) {
        for (let o = 0; o < 5; o++) {
            const nStr = generateCodeSample(
                prefix,
                func,
                i,
                slua,
                o,
                func.signatures[i].args.length > 3,
            );
            const nArgs = func.signatures[i].args.length;
            if (samplePrefered(nStr, str) || nArgs > args) {
                str = nStr;
                args = nArgs;
                sigIndex = i;
            }
        }
    }
    return [str, sigIndex];
}

export function generateCodeSample(
    prefix: string[],
    func: SLuaFuncDef,
    sigIndex: number,
    slua: SLua,
    off: number = 0,
    verbose: boolean = false,
): string {
    const name = prefix.join(".") + (func.takesSelf ? ":" : ".") + func.name;
    return generateCodeSampleForSig(
        name,
        func.signatures[sigIndex],
        off,
        verbose,
        func.takesSelf,
        slua,
    );
}

function samplePrefered(sample1: string, sample2: string) {
    const intc1 = sample1.split("integer(").length - 1;
    const intc2 = sample2.split("integer(").length - 1;
    return intc1 < intc2;
}

function generateCodeSampleForSig(
    name: string,
    sig: SLuaFuncSig,
    off: number = 0,
    verbose: boolean = false,
    takesSelf: boolean = false,
    slua: SLua,
): string {
    const [args, funcs] = buildCodeSampleArgsForSig(
        sig.args,
        off,
        verbose,
        slua,
    );
    if (takesSelf) args.shift();
    const prefix = funcs.length > 0 ? funcs.join("\n\n") + "\n\n" : "";
    if (verbose) {
        return `${prefix}${name}(\n  ${args.join(",\n  ")}\n)`;
    } else {
        return `${prefix}${name}(${args.join(", ")})`;
    }
}

function buildCodeSampleArgsForSig(
    fargs: SLuaFuncArgs,
    off: number,
    verbose: boolean = false,
    slua: SLua,
): [string[], string[]] {
    const args: (string | null)[] = [];
    const funcs: string[] = [];
    for (const arg of fargs) {
        const type = cleanType(arg.type, off);
        switch (type.def) {
            case "custom": {
                const custom = slua.types[type.value];
                if (custom) {
                    let ctype = custom.type;
                    if (ctype instanceof Array) {
                        ctype = ctype[0];
                    }
                    switch (ctype.def) {
                        case "simple":
                            args.push(
                                buildCodeSampleSimpleArgForSig(ctype, verbose),
                            );
                            break;
                        case "value":
                            args.push(ctype.value.toString());
                            break;
                        case "function":
                            funcs.push(
                                generateCodeSampleForFunction(
                                    ctype.value,
                                    arg.name,
                                ),
                            );
                            args.push(arg.name);
                            break;
                        default:
                            args.push(type.value.toString());
                            break;
                    }
                } else {
                    args.push(type.value.toString());
                }
                break;
            }
            case "value":
                args.push(type.value.toString());
                break;
            case "simple":
                args.push(buildCodeSampleSimpleArgForSig(type, verbose));
                break;
            case "function":
                funcs.push(generateCodeSampleForFunction(type.value, arg.name));
                args.push(arg.name);
                break;
            default:
                console.trace("Can't create default for:", type, arg);
                throw "AAAAAAAAA";
        }
    }
    return [args.filter((a) => typeof a == "string"), funcs];
}

function buildCodeSampleSimpleArgForSig(
    type: SLuaSimpleType,
    verbose: boolean = false,
): string | null {
    switch (type.value) {
        case "quaternion":
            return "quaternion(0,0,0,1)";
        case "numeric":
            return Math.floor(Math.random() * 16).toString();
        case "number":
            return "3.14";
        case "list":
        case "{}":
            return "{}";
        case "uuid":
            return verbose
                ? "uuid('677bf9a4-bba5-4cf9-a4ad-4802a0f7ef46')"
                : "uuid(<key>)";
        case "vector":
            return "vector(1,1,1)";
        case "boolean":
            return "true";
        case "string":
            return "'test'";
        case "self":
            return "self";
        case "nil":
            return "nil";
        default:
            console.error("Unknown type", type);
            throw "AAAAAAAAAA";
    }
}

function generateCodeSampleForFunction(
    sig: SLuaFuncSig,
    name?: string,
): string {
    let result = "";
    if (name) {
        result += `local ${name} = `;
    }
    sig = JSON.parse(JSON.stringify(sig));
    for (const arg of sig.args) {
        if (!arg.name) arg.name = "arg";
    }
    return `${result}function(${
        mapArgsToFunctionParamString(sig.args, true)
    }) : ${mapResultToFunctionString(sig.result)}\n  -- Your code\nend`;
}

function cleanTypes(type: SLuaBaseType[]): SLuaBaseType[] {
    if (type.length == 2) {
        if (
            type.some((t) => t.def == "simple" && t.value == "uuid") &&
            type.some((t) => t.def == "simple" && t.value == "string")
        ) {
            return [{ def: "simple", value: "uuid" }];
        }
    }
    return type;
}

function cleanType(stype: SLuaType, off: number = 0): SLuaBaseType {
    if (stype instanceof Array) {
        if (off >= stype.length) off = 0;
    }
    const type = stype instanceof Array ? stype[off] : stype;
    if (type == null) {
        console.trace(stype);
        throw new Error("Cannot cleantype null for generated function");
    }
    return type;
    //   if (typeof type == "object") {
    //     console.error(type);
    //     throw new Error("Failed to case type for docs");
    //   } else {
    //     return type;
    //   }
}
