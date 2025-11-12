import { buildLSLJsonFromXML, LSLDef } from "../xml/xml-lsl-json-gen.ts";
import {
    ConstDef,
    ConstDefs,
    EventDefs,
    FuncArg,
    FuncArgs,
    FuncDef,
    FuncDefs,
    Overrides,
    StrObj,
    TypeDef,
} from "../types.d.ts";
// import _KnownTypes from "../../data/knownTypes.json" with { type: "json" };
import _overrides from "../../data/slua_keywords.overrides.json" with {
    type: "json",
};
import { applyPatches } from "../util.ts";
import { isSimpleTypeValue } from "./slua-common.ts";

const overides = _overrides as Overrides;

// type KnownTypeConstSet = { [k: string]: string | undefined };
// type KnownTypeFuncSet = { [k: string]: KnownTypeFunc | undefined };
// type KnownTypeFunc = {
//   args?: { [k: string]: SLuaType | undefined };
//   return?: SLuaType;
// };

// const KnownTypes = _KnownTypes as {
//   functions: KnownTypeFuncSet;
//   constants: KnownTypeConstSet;
// };

const quaternion = "quaternion";
const uuid = "uuid";
// const integer = "integer";

export type SLuaSimpleTypeValue =
    | "string"
    | "boolean"
    | "number"
    | "vector"
    | "buffer"
    | "{}"
    // | "integer"
    | "quaternion"
    | "uuid"
    | "nil"
    | "list"
    | "self"
    | "any"
    | "()"
    | "numeric";

export type SLuaSimpleType = { def: "simple"; value: SLuaSimpleTypeValue };
export type SLuaFunctionType = { def: "function"; value: SLuaFuncSig };
export type SLuaCustomType = { def: "custom"; value: string };
export type SLuaValueType = { def: "value"; value: string | number };
export type SLuaTableType = { def: "table"; value: SLuaBaseType[] };
export type SLuaClassType = { def: "class"; value: SLuaClassDef };

export type SLuaBaseType =
    | SLuaSimpleType
    | SLuaFunctionType
    | SLuaCustomType
    | SLuaValueType
    | SLuaTableType
    | SLuaClassType;
//  | string
// | null;

export type SLuaType = SLuaBaseType | SLuaBaseType[];

export type SLuaFuncResult = {
    def: "result";
    desc: string;
} & NamedVarOpType;

export type SLuaFuncSig = {
    def: "signature";
    args: SLuaFuncArgs;
    result: SLuaFuncResult[];
};

export type SLuaFuncDef = Omit<FuncDef, "args" | "result"> & {
    signatures: SLuaFuncSig[];
    takesSelf: boolean;
};
export type SLuaConstDef = Omit<ConstDef, "type"> & { type: SLuaBaseType };
// export type SLuaEventDef = Omit<EventDef, "args"> & { args: SLuaFuncArgs };
export type SLuaTypeDef = TypeDef & { type: SLuaType };

export type NamedVarOpType = { name: string } & VarOpType;

export type VarOpType = {
    type: SLuaBaseType[];
    variadic: boolean;
    optional: boolean;
};

export type SLuaFuncArg = Omit<FuncArg, "type"> & VarOpType & {
    example?: string;
};
export type SLuaFuncArgs = SLuaFuncArg[];

export type SLuaDef = SLuaFuncDef | SLuaConstDef | SLuaClassDef | SLuaPropDef;

export type SLuaClassDef = {
    def: "class";
    name: string;
    funcs: StrObj<SLuaFuncDef>;
    props: StrObj<SLuaPropDef>;
};

export type SLuaPropDef = {
    def: "prop";
    name: string;
    desc: string;
    link: string | null;
    type: SLuaType;
    readOnly: boolean;
};

export type SLuaTableDef = StrObj<SLuaDef>;

export type SLuaGlobalTableProp = SLuaDef | SLuaGlobalTable;
export type SLuaGlobalTableProps = StrObj<SLuaGlobalTableProp>;

export type SLuaGlobalTable = {
    def: "table";
    name: string;
    props: SLuaGlobalTableProps;
};

export type SLuaGlobal = StrObj<SLuaDef | SLuaGlobalTable>;

export type SLua = {
    global: SLuaGlobalTable;
    types: StrObj<SLuaTypeDef>;
    classes: StrObj<SLuaClassDef>;
};

let remapLSLArgType: (
    type: string | null,
) => SLuaType = remapLSLArgTypeStrict;

const newCustomType = (t: string): { def: "custom"; value: string } => {
    return { def: "custom", value: t };
};
const newSimpleType = (
    t: string,
): { def: "simple"; value: SLuaSimpleTypeValue } => {
    if (!isSimpleTypeValue(t)) throw new Error(`Invalid simple type '${t}'`);
    return { def: "simple", value: t };
};
const newValueType = (t: string): SLuaValueType => {
    return { def: "value", value: t };
};
const newFuncType = (t: SLuaFuncSig): SLuaFunctionType => {
    return { def: "function", value: t };
};
const newValueTypeArray = (t: string[]): SLuaValueType[] => {
    return t.map(newValueType);
};

const newTableType = (
    t: flexiSluaBaseType,
): SLuaTableType => {
    t = castFlexiType(t);
    if (!(t instanceof Array)) t = [t];
    return { def: "table", value: t };
};

const castFlexiType = (t: flexiSluaBaseType): SLuaType => {
    if (t instanceof Array) return castTypeArray(t);
    return castType(t);
};

const castType = (t: SLuaFuncSig | string | SLuaBaseType): SLuaBaseType => {
    if (typeof t != "string") {
        if (t.def == "signature") {
            return { def: "function", value: t };
        } else return t;
    }
    return newSimpleType(t);
};

const castTypeArray = (t: (string | SLuaBaseType)[]): SLuaBaseType[] => {
    const r: SLuaBaseType[] = [];
    for (const i of t) {
        r.push(castType(i));
    }
    return r;
};

const EventHandler = newCustomType("EventHandler");
const DetectedEventHandler = newCustomType("DetectedEventHandler");

export type SLuaJsonOptions = {
    strict?: boolean;
    includPrivate?: boolean;
};

// deno-lint-ignore require-await
export async function buildSluaJson(
    lsl: LSLDef,
    options: SLuaJsonOptions = {},
): Promise<SLua> {
    const strict = options.strict ?? true;
    if (!strict) remapLSLArgType = remapLSLArgTypeLoose;
    const slua: SLua = {
        global: {
            def: "table",
            name: "SLua",
            props: {
                LLEvents: {
                    def: "const",
                    name: "LLEvents",
                    type: newCustomType("LLEventsProto"),
                    valueRaw: null,
                    value: null,
                    desc: "LLEvents object",
                    link: "",
                },
                LLTimers: {
                    def: "const",
                    name: "LLTimers",
                    type: newCustomType("LLTimersProto"),
                    valueRaw: null,
                    value: null,
                    desc: "LLTimers object",
                    link: "",
                },
                ...builtInSluaFuncs(),
                ...builtInSluaTables(),
                ...buildSLuaGlobalsFromLSL(lsl, options.includPrivate ?? false),
                ...buildSLuaConstsFromLSL(lsl.constants),
            },
        },
        types: builtInSluaTypes(lsl.events),
        classes: builtInSluaClasses(),
    };

    applyPatches(slua, overides);

    return slua;
}

function newFuncEffectSelf(
    name: string,
    desc: string,
    link: string | null,
    results: SLuaFuncSig[] = [],
    self: string,
): SLuaFuncDef {
    const func = newFuncSelf(name, desc, link, results, self);
    func.must_use = false;
    return func;
}

function newFuncEffect(
    name: string,
    desc: string,
    link: string | null,
    results: SLuaFuncSig[] = [],
): SLuaFuncDef {
    const func = newFunc(name, desc, link, results);
    func.must_use = false;
    return func;
}

function newFuncSelf(
    name: string,
    desc: string,
    link: string | null,
    results: SLuaFuncSig[] = [],
    self: string,
): SLuaFuncDef {
    const func = newFunc(name, desc, link, results);
    func.takesSelf = true;
    for (const i in func.signatures) {
        const sig = func.signatures[i];
        sig.args = [newArg("self", "self", newCustomType(self)), ...sig.args];
    }
    return func;
}

function newFunc(
    name: string,
    desc: string,
    link: string | null,
    results: SLuaFuncSig[] = [],
): SLuaFuncDef {
    return {
        def: "func",
        name,
        energy: 0,
        must_use: true,
        sleep: 0,
        signatures: results,
        desc,
        link,
        takesSelf: false,
        private: false,
    };
}

function _newVResult(
    type: SLuaBaseType | SLuaBaseType[],
    desc: string = "",
): SLuaFuncResult {
    return newResult("", type, desc, true);
}
function _newOResult(
    type: SLuaBaseType | SLuaBaseType[],
    desc: string = "",
): SLuaFuncResult {
    return newResult("", type, desc, false, true);
}
function _newOVResult(
    type: SLuaBaseType | SLuaBaseType[],
    desc: string = "",
): SLuaFuncResult {
    return newResult("", type, desc, true, true);
}

type flexiSluaBaseType =
    | SLuaBaseType
    | SLuaBaseType[]
    | string
    | string[]
    | SLuaFuncSig;

function newResult(
    name: string,
    type: flexiSluaBaseType,
    desc: string = "",
    variadic: boolean = false,
    optional: boolean = false,
): SLuaFuncResult {
    if (type instanceof Array) {
        type = castTypeArray(type);
    } else type = castType(type);
    if (!(type instanceof Array)) type = [type];
    return {
        name,
        def: "result",
        desc,
        variadic,
        type,
        optional,
    };
}

function newSFuncSignature(
    result: flexiSluaBaseType,
    args: SLuaFuncArgs = [],
): SLuaFuncSig {
    return newFuncSignature(
        newResult("", result),
        args,
    );
}

function newFuncSignature(
    result: SLuaFuncResult[] | SLuaFuncResult,
    args: SLuaFuncArgs = [],
): SLuaFuncSig {
    if (!(result instanceof Array)) result = [result];
    return {
        def: "signature",
        result,
        args,
    };
}
function newOArg(
    name: string,
    desc: string,
    type: flexiSluaBaseType,
): SLuaFuncArg {
    return newArg(name, desc, type, false, true);
}

function newVArg(
    name: string,
    desc: string,
    type: flexiSluaBaseType,
): SLuaFuncArg {
    return newArg(name, desc, type, true);
}

function newOVArg(
    name: string,
    desc: string,
    type: flexiSluaBaseType,
): SLuaFuncArg {
    return newArg(name, desc, type, true, true);
}

function newArg(
    name: string,
    desc: string,
    btype: flexiSluaBaseType,
    variadic: boolean = false,
    optional: boolean = false,
): SLuaFuncArg {
    if (btype instanceof Array) {
        btype = castTypeArray(btype);
    } else btype = castType(btype);
    const type = btype instanceof Array ? btype : [btype];
    return {
        def: "arg",
        name,
        desc,
        type,
        variadic,
        optional,
    };
}

function builtInSluaTables(): SLuaGlobal {
    return {
        bit32: buildBit32(),
        lljson: buildLLJSON(),
        llbase64: buildLLBase64(),
        vector: buildVector(),
    };
}

function newConstFromLSL(lsl: ConstDef): SLuaConstDef {
    const type = remapLSLConstType(lsl.type);
    const con = newConst(lsl.name, lsl.desc, type);
    con.link = lsl.link;
    con.value = lsl.value;
    con.valueRaw = lsl.valueRaw;
    return con;
}

function newReadOnlyProp(
    name: string,
    desc: string,
    type: flexiSluaBaseType,
): SLuaPropDef {
    return newProp(name, desc, type, true);
}

function newProp(
    name: string,
    desc: string,
    type: flexiSluaBaseType,
    readOnly: boolean = false,
): SLuaPropDef {
    return {
        def: "prop",
        name,
        desc,
        link: null,
        type: castFlexiType(type),
        readOnly,
    };
}

function newConst(
    name: string,
    desc: string,
    type: SLuaBaseType | string,
): SLuaConstDef {
    if (typeof type == "string") {
        type = newSimpleType(type);
    }
    return {
        def: "const",
        name,
        type,
        value: null,
        valueRaw: null,
        desc,
        link: "",
    };
}

function newNoUrlFunc(name: string, desc: string, results: SLuaFuncSig[]) {
    return newFunc(name, desc, "", results);
}

function buildLLJSON(): SLuaGlobalTable {
    const props: StrObj<SLuaConstDef | SLuaFuncDef> = {
        "_NAME": newConst(
            "_NAME",
            "Name of the lljson table",
            newValueType('"lljson"'),
        ),
        "_VERSION": newConst(
            "_VERSION",
            "Version of the lljson library (based on the lua-cjson library)",
            "string",
        ),
        array_mt: newConst(
            "array_mt",
            "Metatable for declaring table as an array for json encode",
            "{}",
        ),
        empty_array_mt: newConst(
            "array_mt",
            "Metatable for declaring table as an empty array for json encode",
            "{}",
        ),
        empty_array: newConst(
            "empty_array",
            "A constant to pass for an empty array to json encode",
            newCustomType("lljson_constant"),
        ),
        null: newConst(
            "null",
            "A constant to pass for null to json encode",
            newCustomType("lljson_constant"),
        ),
        encode: newNoUrlFunc("encode", "encode lua value as json", [
            newSFuncSignature(
                "string",
                [
                    newArg(
                        "value",
                        "value to encode",
                        [
                            "string",
                            "number",
                            // "integer",
                            "vector",
                            "uuid",
                            "quaternion",
                            "boolean",
                            "{}",
                            "nil",
                        ],
                    ),
                ],
            ),
        ]),
        decode: newNoUrlFunc("decode", "decode json string to lua value", [
            newSFuncSignature(
                [
                    "string",
                    "number",
                    // "integer",
                    "vector",
                    "uuid",
                    "quaternion",
                    "boolean",
                    "{}",
                    "nil",
                ],
                [
                    newArg(
                        "json",
                        "json string to decode",
                        "string",
                    ),
                ],
            ),
        ]),
    };
    return {
        def: "table",
        name: "lljson",
        props,
    };
}

function buildLLBase64(): SLuaGlobalTable {
    const props: SLuaGlobalTableProps = {
        encode: newNoUrlFunc("encode", "encode a string or buffer to base64", [
            newSFuncSignature(
                "string",
                [
                    newArg(
                        "value",
                        "value to encode",
                        ["string", "buffer"],
                    ),
                ],
            ),
        ]),
        decode: newNoUrlFunc(
            "decode",
            "decode a base64 string, to a buffer or string",
            [
                newSFuncSignature(
                    "string",
                    [
                        newArg(
                            "base64",
                            "base64 string to decode",
                            "string",
                        ),
                    ],
                ),
                newSFuncSignature(
                    "buffer",
                    [
                        newArg(
                            "base64",
                            "base64 string to decode",
                            "string",
                        ),
                        newArg(
                            "asBuffer",
                            "",
                            newValueType("true"),
                        ),
                    ],
                ),
                newSFuncSignature(
                    "string",
                    [
                        newArg(
                            "base64",
                            "base64 string to decode",
                            "string",
                        ),
                        newArg(
                            "asBuffer",
                            "",
                            newValueType("false"),
                        ),
                    ],
                ),
            ],
        ),
    };
    return {
        def: "table",
        name: "llbase64",
        props,
    };
}

function newLuauFunc(
    section: string,
    name: string,
    desc: string,
    results: SLuaFuncSig[] = [],
): SLuaFuncDef {
    return newFunc(
        name,
        desc,
        `https://luau.org/library#bit32-library#:~:text=function%20${section}.${name}`,
        results,
    );
}

function addToTable(g: SLuaGlobalTable, p: SLuaFuncDef | SLuaConstDef) {
    g.props[p.name] = p;
}

function buildVector(): SLuaGlobalTable {
    const newVecFunc = (
        name: string,
        desc: string,
        results: SLuaFuncSig[] = [],
    ): SLuaFuncDef => {
        return newLuauFunc(
            "bit32",
            name,
            desc,
            results,
        );
    };
    const vec: SLuaGlobalTable = {
        def: "table",
        name: "vector",
        props: {},
    };
    addToTable(
        vec,
        newConst(
            "zero",
            "A Zero vector <0,0,0>",
            "vector",
        ),
    );

    addToTable(
        vec,
        newConst(
            "one",
            "A one vector <1,1,1>",
            "vector",
        ),
    );

    addToTable(
        vec,
        newVecFunc(
            "create",
            "Creates a new vector with the given component values",
            [
                newSFuncSignature(
                    "vector",
                    [
                        newArg("x", "x value of vector", "number"),
                        newArg("y", "y value of vector", "number"),
                        newArg("z", "z value of vector", "number"),
                    ],
                ),
            ],
        ),
    );

    addToTable(
        vec,
        newVecFunc(
            "magnitude",
            "Calculates the magnitude of a given vector.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newArg("vec", "", "vector"),
                    ],
                ),
            ],
        ),
    );

    addToTable(
        vec,
        newVecFunc(
            "normalize",
            "Computes the normalized version (unit vector) of a given vector.",
            [
                newSFuncSignature(
                    "vector",
                    [
                        newArg("vec", "", "vector"),
                    ],
                ),
            ],
        ),
    );

    addToTable(
        vec,
        newVecFunc(
            "cross",
            "Computes the cross product of two vectors.",
            [
                newSFuncSignature(
                    "vector",
                    [
                        newArg("vec1", "", "vector"),
                        newArg("vec2", "", "vector"),
                    ],
                ),
            ],
        ),
    );

    addToTable(
        vec,
        newVecFunc(
            "dot",
            "Computes the dot product of two vectors.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newArg("vec1", "", "vector"),
                        newArg("vec2", "", "vector"),
                    ],
                ),
            ],
        ),
    );

    addToTable(
        vec,
        newVecFunc(
            "angle",
            "Computes the angle between two vectors in radians. The axis, if specified, is used to determine the sign of the angle.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newArg("vec1", "", "vector"),
                        newArg("vec2", "", "vector"),
                        newOArg("axis", "", "vector"),
                    ],
                ),
            ],
        ),
    );

    addToTable(
        vec,
        newVecFunc(
            "floor",
            "Applies `math.floor` to every component of the input vector.",
            [
                newSFuncSignature(
                    "vector",
                    [
                        newArg("vec", "", "vector"),
                    ],
                ),
            ],
        ),
    );

    addToTable(
        vec,
        newVecFunc(
            "ceil",
            "Applies `math.ceil` to every component of the input vector.",
            [
                newSFuncSignature(
                    "vector",
                    [
                        newArg("vec", "", "vector"),
                    ],
                ),
            ],
        ),
    );

    addToTable(
        vec,
        newVecFunc(
            "abs",
            "Applies `math.abs` to every component of the input vector.",
            [
                newSFuncSignature(
                    "vector",
                    [
                        newArg("vec", "", "vector"),
                    ],
                ),
            ],
        ),
    );

    addToTable(
        vec,
        newVecFunc(
            "sign",
            "Applies `math.sign` to every component of the input vector.",
            [
                newSFuncSignature(
                    "vector",
                    [
                        newArg("vec", "", "vector"),
                    ],
                ),
            ],
        ),
    );

    addToTable(
        vec,
        newVecFunc(
            "clamp",
            "Applies `math.clamp` to every component of the input vector.",
            [
                newSFuncSignature(
                    "vector",
                    [
                        newArg("vec", "", "vector"),
                        newArg("min", "", "vector"),
                        newArg("max", "", "vector"),
                    ],
                ),
            ],
        ),
    );

    addToTable(
        vec,
        newVecFunc(
            "max",
            "Applies `math.max` to the corresponding components of the input vectors.",
            [
                newSFuncSignature(
                    "vector",
                    [
                        newVArg("vecs", "", "vector"),
                    ],
                ),
            ],
        ),
    );

    addToTable(
        vec,
        newVecFunc(
            "min",
            "Applies `math.min` to the corresponding components of the input vectors.",
            [
                newSFuncSignature(
                    "vector",
                    [
                        newVArg("vecs", "", "vector"),
                    ],
                ),
            ],
        ),
    );

    return vec;
}

function buildBit32(): SLuaGlobalTable {
    const newBFunc = (
        name: string,
        desc: string,
        results: SLuaFuncSig[] = [],
    ): SLuaFuncDef => {
        return newLuauFunc(
            "bit32",
            name,
            desc,
            results,
        );
    };
    const props: SLuaGlobalTableProps = {
        arshift: newBFunc(
            "arshift",
            "Shifts `n` by `i` bits to the right (if `i` is negative, a left shift is performed instead).\nThe most significant bit of `n` is propagated during the shift.\nWhen `i` is larger than `31`, returns an integer with all bits set to the sign bit of `n`.\nWhen `i` is smaller than `-31`, `0` is returned",
            [
                newSFuncSignature(
                    "number",
                    [
                        newArg("n", "number to be shifted", "number"),
                        newArg("i", "bits to shift by", "number"),
                    ],
                ),
            ],
        ),
        band: newBFunc(
            "band",
            "Performs a bitwise and of all input numbers and returns the result.\nIf the function is called with no arguments, an integer with all bits set to `1` is returned.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newVArg("args", "numbers to and together", "number"),
                    ],
                ),
            ],
        ),
        bnot: newBFunc(
            "bnot",
            "Returns a bitwise negation of the input number.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newArg("n", "number to not", "number"),
                    ],
                ),
            ],
        ),
        bor: newBFunc(
            "bor",
            "Performs a bitwise or of all input numbers and returns the result.\nIf the function is called with no arguments, `0` is returned.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newVArg("args", "numbers to or together", "number"),
                    ],
                ),
            ],
        ),
        bxor: newBFunc(
            "bxor",
            "Performs a bitwise xor (exclusive or) of all input numbers and returns the result.\nIf the function is called with no arguments, `0` is returned.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newVArg("args", "numbers to xor together", "number"),
                    ],
                ),
            ],
        ),
        btest: newBFunc(
            "btest",
            "Perform a bitwise and of all input numbers, and return `true` if the result is not `0`.\nIf the function is called with no arguments, `true` is returned.",
            [
                newSFuncSignature(
                    "boolean",
                    [
                        newVArg("args", "values to test together", "number"),
                    ],
                ),
            ],
        ),
        extract: newBFunc(
            "extract",
            "Extracts bits of `n` at position `f` with `a` width of `w`, and returns the resulting integer.\n`w` defaults to 1, so a two-argument version of extract returns the bit value at position `f`.\nBits are indexed starting at `0`.\nErrors if `f` and `f+w-1` are not between `0` and `31`.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newArg("n", "", "number"),
                        newArg("f", "", "number"),
                        newArg("w", "", "number"),
                    ],
                ),
            ],
        ),
        lrotate: newBFunc(
            "lrotate",
            "Rotates `n` to the left by `i` bits (if `i` is negative, a right rotate is performed instead)\nThe bits that are shifted past the bit width are shifted back from the right.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newArg("n", "", "number"),
                        newArg("i", "", "number"),
                    ],
                ),
            ],
        ),
        lshift: newBFunc(
            "lshift",
            "Shifts `n` to the left by `i` bits (if `i` is negative, a right shift is performed instead).\nWhen `i` is outside of `[-31..31]` range, returns `0`.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newArg("n", "", "number"),
                        newArg("i", "", "number"),
                    ],
                ),
            ],
        ),
        replace: newBFunc(
            "replace",
            "Replaces bits of `n` at position `f` and width `w` with `r`, and returns the resulting integer.\n`w` defaults to `1`, so a three-argument version of replace changes one bit at position `f` to `r` (which should be `0` or `1`) and returns the result.\nBits are indexed starting at `0`.\nErrors if `f` and `f+w-1` are not between `0` and `31`.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newArg("n", "", "number"),
                        newArg("r", "", "number"),
                        newArg("f", "", "number"),
                        newOArg("w", "", "number"),
                    ],
                ),
            ],
        ),
        rrotate: newBFunc(
            "rrotate",
            "Rotates `n` to the right by `i` bits (if `i` is negative, a left rotate is performed instead)\nThe bits that are shifted past the bit width are shifted back from the left.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newArg("n", "", ["number"]),
                        newArg("i", "", ["number"]),
                    ],
                ),
            ],
        ),
        rshift: newBFunc(
            "rshift",
            "Shifts `n` to the right by `i` bits (if `i` is negative, a left shift is performed instead).\nWhen `i` is outside of `[-31..31]` range, returns `0`.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newArg("n", "", ["number"]),
                        newArg("i", "", ["number"]),
                    ],
                ),
            ],
        ),
        countlz: newBFunc(
            "countlz",
            "Returns the number of consecutive zero bits in the 32-bit representation of `n` starting from the left-most (most significant) bit.\nReturns `32` if `n` is `0`.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newArg("n", "", ["number"]),
                    ],
                ),
            ],
        ),
        countrz: newBFunc(
            "countrz",
            "Returns the number of consecutive zero bits in the 32-bit representation of `n` starting from the right-most (least significant) bit.\nReturns `32` if `n` is `0`.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newArg("n", "", ["number"]),
                    ],
                ),
            ],
        ),
        byteswap: newBFunc(
            "byteswap",
            "Returns n with the order of the bytes swapped.",
            [
                newSFuncSignature(
                    "number",
                    [
                        newArg("n", "", ["number"]),
                    ],
                ),
            ],
        ),
    };
    return {
        def: "table",
        name: "bit32",
        props,
    };
}

const detectedEventNames: string[] = [
    "touch_start",
    "touch_end",
    "touch",
    "collision_start",
    "collision",
    "collision_end",
    "sensor",
    "on_damage",
    "final_damage",
];

function builtInSluaTypes(lslEvents: EventDefs): StrObj<SLuaTypeDef> {
    const [_eventNames, nonDetectedEventNames] = getSplitEventNames(lslEvents);

    return {
        "numeric": {
            name: "numeric",
            desc:
                "numeric type to genericize for functions that accept any numric type",
            type: [
                castType("boolean"),
                castType("number"),
            ],
        },
        "list": {
            name: "list",
            desc:
                "a table type to try and restrict LL functions that only accept flat lists",
            type: newTableType([
                "string",
                "number",
                "vector",
                "uuid",
                "quaternion",
                "boolean",
            ]),
        },
        "lljson_constant": {
            name: "lljson_constant",
            desc: "A set of constants for changing json encode output",
            type: castType("number"),
        },
        DetectedEvent: buildDetectedEvent(),
        DetectedEventName: {
            name: "DetectedEventName",
            desc: "Event names",
            type: newValueTypeArray(detectedEventNames.map((v) => `"${v}"`)),
        },
        NonDetectedEventName: {
            name: "NonDetectedEventName",
            desc: "Event Names",
            type: newValueTypeArray(nonDetectedEventNames.map((v) => `"${v}"`)),
        },
        EventName: {
            name: "EventName",
            desc: "Event Names",
            type: [
                newCustomType("DetectedEventName"),
                newCustomType("NonDetectedEventName"),
            ],
        },
        EventHandler: {
            name: "EventHandler",
            desc: "EventHandler Type",
            type: {
                def: "function",
                value: newSFuncSignature(
                    "()",
                    [
                        newVArg(
                            "",
                            "",
                            "any",
                        ),
                    ],
                ),
            },
        },
        DetectedEventHandler: {
            name: "DetectedEventHandler",
            desc: "DetectedEventHandler Type",
            type: {
                def: "function",
                value: newSFuncSignature(
                    "()",
                    [
                        newArg(
                            "",
                            "",
                            newTableType(newCustomType("DetectedEvent")),
                        ),
                    ],
                ),
            },
        },
        // Events
        "LLEventsProto": {
            name: "LLEventsProto",
            desc: "Type of events class",
            type: {
                def: "class",
                value: buildSLuaEventsFromLSL(lslEvents),
            },
        },
        "LLTimersProto": {
            name: "LLTimersProto",
            desc: "Type of timers class",
            type: {
                def: "class",
                value: buildSLuaTimersProto(),
            },
        },
    };
}

function buildDetectedEvent(): SLuaTypeDef {
    const newDetectedFunc = (
        name: string,
        desc: string,
        type: flexiSluaBaseType,
    ) => {
        return newFuncSelf(
            name,
            desc,
            "",
            [
                newSFuncSignature(type),
            ],
            "DetectedEvent",
        );
    };

    const value: SLuaClassDef = {
        def: "class",
        name: "DetectedEvent",
        props: {
            valid: newReadOnlyProp("valid", "", "boolean"),
            index: newReadOnlyProp("index", "", "number"),
            can_change_damage: newReadOnlyProp(
                "can_change_damage",
                "",
                "boolean",
            ),
        },
        funcs: {
            getOwner: newDetectedFunc("getOwner", "DetectedOwner", "uuid"),
            getName: newDetectedFunc("getName", "ll.DetectedName", "string"),
            getKey: newDetectedFunc("getKey", "ll.DetectedKey", "uuid"),
            getTouchFace: newDetectedFunc(
                "getTouchFace",
                "ll.DetectedTouchFace",
                "number",
            ),
            getLinkNumber: newDetectedFunc(
                "getLinkNumber",
                "ll.DetectedLinkNumber",
                "number",
            ),
            getGrab: newDetectedFunc("getGrab", "ll.DetectedGrab", "vector"),
            getGroup: newDetectedFunc(
                "getGroup",
                "ll.DetectedGroup",
                "boolean",
            ),
            getPos: newDetectedFunc("getPos", "ll.DetectedPos", "vector"),
            getRot: newDetectedFunc("getRot", "ll.DetectedRot", quaternion),
            getTouchBinormal: newDetectedFunc(
                "getTouchBinormal",
                "ll.DetectedTouchBinormal",
                "vector",
            ),
            getTouchNormal: newDetectedFunc(
                "getTouchNormal",
                "ll.DetectedTouchNormal",
                "vector",
            ),
            getTouchPos: newDetectedFunc(
                "getTouchPos",
                "DetectedTouchPos",
                "vector",
            ),
            getTouchST: newDetectedFunc(
                "getTouchST",
                "ll.DetectedTouchST",
                "vector",
            ),
            getTouchUV: newDetectedFunc(
                "getTouchUV",
                "ll.DetectedTouchUV",
                "vector",
            ),
            getType: newDetectedFunc("getType", "DetectedType", "number"),
            getVel: newDetectedFunc("getVel", "ll.DetectedVel", "vector"),
            getRezzer: newDetectedFunc(
                "getRezzer",
                "ll.DetectedRezzer",
                "uuid",
            ),
        },
    };

    return {
        name: "DetectedEvent",
        desc: "Detected Event Object",
        type: {
            def: "class",
            value,
        },
    };
}

function buildSLuaTimersProto(): SLuaClassDef {
    return {
        def: "class",
        name: "LLTimersProto",
        funcs: {
            every: newFuncEffectSelf(
                "every",
                "Start a timer that ticks at defined interval",
                null,
                [
                    newSFuncSignature(
                        EventHandler,
                        [
                            newArg("seconds", "interval in seconds", "number"),
                            newArg(
                                "handler",
                                "handler function",
                                newFuncType(
                                    newSFuncSignature(
                                        "()",
                                        [
                                            newArg(
                                                "scheduledTime",
                                                "The time the timer was meant to fire, see `ll.GetTime`",
                                                "number",
                                            ),
                                            newArg(
                                                "delay",
                                                "The interval specified for this timer",
                                                "number",
                                            ),
                                        ],
                                    ),
                                ),
                            ),
                        ],
                    ),
                ],
                "LLTimersProto",
            ),
            once: newFuncEffectSelf(
                "once",
                "Execute a function once after a defined delay",
                null,
                [
                    newSFuncSignature(
                        EventHandler,
                        [
                            newArg("seconds", "delay in seconds", "number"),
                            newArg(
                                "handler",
                                "handler function",
                                newFuncType(
                                    newSFuncSignature(
                                        "()",
                                        [
                                            newArg(
                                                "scheduledTime",
                                                "The time the timer was meant to fire, use `ll.GetTime` to calculate delta",
                                                "number",
                                            ),
                                        ],
                                    ),
                                ),
                            ),
                        ],
                    ),
                ],
                "LLTimersProto",
            ),
            off: newFuncEffectSelf(
                "off",
                "Cancel a timer or delay",
                null,
                [
                    newSFuncSignature(
                        "boolean",
                        [
                            newArg("handler", "handler function", EventHandler),
                        ],
                    ),
                ],
                "LLTimersProto",
            ),
        },
        props: {},
    };
}

function builtInSluaFuncs(): StrObj<SLuaFuncDef> {
    return {
        // [integer]: newNoUrlFunc(integer, "Creates an integer value from argument", [
        //   newSFuncSignature(integer, [
        //     newArg(
        //       "value",
        //       "value to be convetered to an integer",
        //       ["string", "number"],
        //     ),
        //   ]),
        // ]),
        [uuid]: newNoUrlFunc(uuid, "Creates a uuid from a string argument", [
            newSFuncSignature(uuid, [
                newArg(
                    "str",
                    "string to create uuid from",
                    "string",
                ),
            ]),
        ]),
        toquaternion: newNoUrlFunc(
            "toquaternion",
            "Creates a quaternion from a string argument in format `<1,1,1,1>`\n\nInvalid strings will return `nil`\n\n#### Caveat\n\nDue to an old error from lsl strings that match upto the closing `>` are interpreted as valid\n\nSo `<1,1,1,1` and `<1,1,1,1spoon` are both cast to `<1,1,1,1>`\n\nWhen testing if a string is a quaternion or a vector, you should test with `toquaternion` first.",
            [
                newSFuncSignature([quaternion, "nil"], [
                    newArg(
                        "str",
                        `string to create ${quaternion} from`,
                        "string",
                    ),
                ]),
            ],
        ),
        tovector: newNoUrlFunc(
            "tovector",
            "Creates a vector from a string argument in format `<1,1,1>`\n\nInvalid strings will return `nil`\n\n#### Caveat\n\nDue to an old error from lsl strings that match upto the closing `>` are interpreted as valid\n\nSo `<1,1,1`, `<1,1,1,1` and `<1,1,1spoon` are all cast to `<1,1,1>`\n\nWhen testing if a string is a quaternion or a vector, you should test with `toquaternion` first.",
            [
                newSFuncSignature(["vector", "nil"], [
                    newArg(
                        "str",
                        "string to create vector from",
                        "string",
                    ),
                ]),
            ],
        ),
        [quaternion]: newNoUrlFunc(
            quaternion,
            "Creates a quaternion from x,y,z,s",
            [
                newSFuncSignature(quaternion, [
                    newArg(
                        "x",
                        "x value of quaternion",
                        "number",
                    ),
                    newArg(
                        "y",
                        "y value of quaternion",
                        "number",
                    ),
                    newArg(
                        "z",
                        "z value of quaternion",
                        "number",
                    ),
                    newArg(
                        "s",
                        "s value of quaternion",
                        "number",
                    ),
                ]),
            ],
        ),
    };
}

function builtInSluaClasses(): StrObj<SLuaClassDef> {
    const selfArg = newArg("self", "", "self");
    const newSelfFuncSig = function (
        result: flexiSluaBaseType,
        arg: flexiSluaBaseType,
    ) {
        return newSFuncSignature(result, [
            selfArg,
            newArg("other", "", arg),
        ]);
    };
    const classes: StrObj<SLuaClassDef> = {};
    classes["uuid"] = {
        def: "class",
        name: "uuid",
        props: {
            istruthy: newReadOnlyProp(
                "istruthy",
                "property to check if uuid is valid",
                "boolean",
            ),
        },
        funcs: {
            "__tostring": newNoUrlFunc(
                "__tostring",
                "converts uuid to a string",
                [
                    newSFuncSignature("string", [selfArg]),
                ],
            ),
        },
    };
    classes[quaternion] = {
        def: "class",
        name: quaternion,
        props: {
            x: newReadOnlyProp(
                "x",
                `x property of ${quaternion}`,
                "number",
            ),
            y: newReadOnlyProp(
                "y",
                `y property of ${quaternion}`,
                "number",
            ),
            z: newReadOnlyProp(
                "z",
                `z property of ${quaternion}`,
                "number",
            ),
            s: newReadOnlyProp(
                "s",
                `s property of ${quaternion}`,
                "number",
            ),
        },
        funcs: {
            "__mul": newNoUrlFunc(
                "__mul",
                "multiply vector/quaternion by quaternion",
                [
                    newSFuncSignature("vector", [
                        selfArg,
                        newArg("other", "", "vector"),
                    ]),
                    newSFuncSignature("quaternion", [
                        selfArg,
                        newArg("other", "", "quaternion"),
                    ]),
                ],
            ),
        },
    };
    classes.vector = {
        def: "class",
        name: "vector",
        props: {
            x: newReadOnlyProp(
                "x",
                `x property of vector`,
                "number",
            ),
            y: newReadOnlyProp(
                "y",
                `y property of vector`,
                "number",
            ),
            z: newReadOnlyProp(
                "z",
                `z property of vector`,
                "number",
            ),
        },
        funcs: {
            "__mul": newNoUrlFunc(
                "__mul",
                "multiply vector by number, vector, or quaternion",
                [
                    newSelfFuncSig("vector", "vector"),
                    newSelfFuncSig("vector", quaternion),
                    newSelfFuncSig("vector", "number"),
                ],
            ),
            "__div": newNoUrlFunc(
                "__div",
                "divide vector by number, vector, or quaternion",
                [
                    newSelfFuncSig("vector", "vector"),
                    newSelfFuncSig("vector", quaternion),
                    newSelfFuncSig("vector", "number"),
                ],
            ),
            "__idiv": newNoUrlFunc(
                "__idiv",
                "floor divide vector by number, vector, or quaternion",
                [
                    newSelfFuncSig("vector", "vector"),
                    newSelfFuncSig("vector", quaternion),
                    newSelfFuncSig("vector", "number"),
                ],
            ),
            "__add": newNoUrlFunc(
                "__add",
                "add two vectors",
                [
                    newSelfFuncSig("vector", "vector"),
                ],
            ),
            "__sub": newNoUrlFunc(
                "__sub",
                "subtract vector from vector",
                [
                    newSelfFuncSig("vector", "vector"),
                ],
            ),
            "__unm": newNoUrlFunc(
                "__unm",
                "negate a vector",
                [
                    newSFuncSignature("vector", [selfArg]),
                ],
            ),
        },
    };
    // const iSelfNI = [
    //   newSelfFuncSig(integer, integer),
    //   newSelfFuncSig("number", "number"),
    // ];
    // classes[integer] = {
    //   def: "class",
    //   name: integer,
    //   props: {},
    //   funcs: {
    //     "__add": newNoUrlFunc(
    //       "__add",
    //       "Meta function to allow for '+' operation",
    //       iSelfNI,
    //     ),
    //     "__sub": newNoUrlFunc(
    //       "__sub",
    //       "Meta function to allow for '-' operation",
    //       iSelfNI,
    //     ),
    //     "__mul": newNoUrlFunc(
    //       "__mul",
    //       "Meta function to allow for '*' operation",
    //       iSelfNI,
    //     ),
    //     "__div": newNoUrlFunc(
    //       "__div",
    //       "Meta function to allow for '/' operation",
    //       [
    //         newSelfFuncSig("number", integer),
    //         newSelfFuncSig("number", "number"),
    //       ],
    //     ),
    //     "__unm": newNoUrlFunc(
    //       "__unm",
    //       "Meta function to allow for '-' negation",
    //       [
    //         newSFuncSignature("integer", [selfArg]),
    //       ],
    //     ),
    //     "__mod": newNoUrlFunc(
    //       "__mod",
    //       "Meta function to allow for '%' operation",
    //       iSelfNI,
    //     ),
    //     "__pow": newNoUrlFunc(
    //       "__pow",
    //       "Meta function to allow for '^' operation",
    //       iSelfNI,
    //     ),
    //     "__idiv": newNoUrlFunc(
    //       "__idiv",
    //       "Meta function to allow for '//' operation",
    //       iSelfNI,
    //     ),
    //     "__eq": newNoUrlFunc(
    //       "__eq",
    //       "Meta function to allow for '==' operation",
    //       [
    //         newSFuncSignature("integer", [
    //           selfArg,
    //           newArg("other", "", "integer"),
    //         ]),
    //       ],
    //     ),
    //     "__lt": newNoUrlFunc(
    //       "__lt",
    //       "Meta function to allow for '<' and '>' operation",
    //       [
    //         newSFuncSignature("integer", [
    //           selfArg,
    //           newArg("other", "", "integer"),
    //         ]),
    //       ],
    //     ),
    //     "__le": newNoUrlFunc(
    //       "__le",
    //       "Meta function to allow for '<=' and '>=' operation",
    //       [
    //         newSFuncSignature("integer", [
    //           selfArg,
    //           newArg("other", "", "integer"),
    //         ]),
    //       ],
    //     ),
    //   },
    // };
    return classes;
}

function buildSLuaConstsFromLSL(lslConsts: ConstDefs): StrObj<SLuaConstDef> {
    const consts: StrObj<SLuaConstDef> = {};
    for (const key in lslConsts) {
        const lslCon = lslConsts[key];
        const con = newConstFromLSL(lslCon);
        consts[con.name] = con;
    }
    return Object.keys(consts).sort().reduce(
        (obj: StrObj<SLuaConstDef>, key): StrObj<SLuaConstDef> => {
            obj[key] = consts[key];
            return obj;
        },
        {},
    );
}

function getSplitEventNames(lslEvents: EventDefs): [string[], string[]] {
    const eventNames: string[] = [];

    for (const key in lslEvents) {
        const { name, args, desc, link, ...lslFunc } = lslEvents[key];
        if (name == "timer" || name.startsWith("state_")) continue;
        eventNames.push(name);
    }

    detectedEventNames.sort();

    const nonDetectedEventNames: string[] = eventNames.filter((n) =>
        !detectedEventNames.includes(n)
    );
    eventNames.sort();
    nonDetectedEventNames.sort();
    return [eventNames, nonDetectedEventNames];
}

function buildSLuaEventsFromLSL(lslEvents: EventDefs): SLuaClassDef {
    const funcs: StrObj<SLuaFuncDef> = {};
    // const props: StrObj<SLuaConstDef> = {};

    // for (const key in lslEvents) {
    //   const { name, args, desc, link, ...lslFunc } = lslEvents[key];
    //   if (name == "timer") continue;

    //   const prop: SLuaConstDef = {
    //     def: "const",
    //     desc,
    //     link,
    //     name,
    //     type: { def: "simple", value: "nil" },
    //     valueRaw: null,
    //     value: null,
    //   };

    //   props[prop.name] = prop;
    // }

    funcs.eventNames = newFuncSelf(
        "eventNames",
        "List event names of currently registered event handlers",
        "",
        [
            newSFuncSignature(
                newTableType("string"),
                [],
            ),
        ],
        "LLEventsProto",
    );

    funcs.listeners = newFuncSelf(
        "listeners",
        "Get set handlers for event name",
        null,
        [
            newSFuncSignature(
                newTableType(newCustomType("EventHandler")),
                [
                    newArg(
                        "eventName",
                        "name of the Event to hook",
                        newCustomType("EventName"),
                    ),
                ],
            ),
        ],
        "LLEventsProto",
    );

    funcs.on = newFuncEffectSelf(
        "on",
        "Method for hooking event by name",
        null,
        [
            newSFuncSignature(
                EventHandler,
                [
                    newArg(
                        "eventName",
                        "name of the Event to hook",
                        newCustomType("DetectedEventName"),
                    ),
                    newArg(
                        "handler",
                        "The name of the function to handle the event",
                        DetectedEventHandler,
                    ),
                ],
            ),
            newSFuncSignature(
                EventHandler,
                [
                    newArg(
                        "eventName",
                        "name of the Event to hook",
                        newCustomType("NonDetectedEventName"),
                    ),
                    newArg(
                        "handler",
                        "The name of the function to handle the event",
                        EventHandler,
                    ),
                ],
            ),
        ],
        "LLEventsProto",
    );
    funcs.off = newFuncEffectSelf(
        "off",
        "Clear a event handler",
        null,
        [
            newSFuncSignature(
                "boolean",
                [
                    newArg(
                        "handler",
                        "The name of the function to handle the event",
                        EventHandler,
                    ),
                ],
            ),
        ],
        "LLEventsProto",
    );
    // const events: StrObj<SLuaEventDef> = {};
    // for (const key in lslEvents) {
    //   const lslEvent = lslEvents[key];
    //   if (lslEvent.name.startsWith("state_")) continue;
    //   const event: SLuaEventDef = {
    //     def: "event",
    //     name: lslEvent.name,
    //     args: remapLSLFuncArgs(lslEvent.args),
    //     desc: lslEvent.desc,
    //     link: lslEvent.link,
    //   };
    //   events[event.name] = event;
    // }
    return {
        def: "class",
        name: "LLEventsProto",
        funcs,
        props: {},
    };
}

function buildSLuaGlobalsFromLSL(
    lsl: LSLDef,
    includePrivate: boolean = false,
): SLuaGlobal {
    const global: SLuaGlobal = {
        ll: buildSLuaLLFuncsFromLSL(lsl.functions, includePrivate),
    };
    return global;
}

function buildSLuaLLFuncsFromLSL(
    lslFuncs: FuncDefs,
    includePrivate: boolean = false,
): SLuaGlobalTable {
    const props: SLuaGlobalTableProps = {};
    for (const key in lslFuncs) {
        const { name, result, args, ...lslFunc } = lslFuncs[key];
        if (lslFunc.private && !includePrivate) continue;
        const func: SLuaFuncDef = {
            ...lslFunc,
            takesSelf: false,
            name: name.substring(2),
            signatures: [
                newSFuncSignature(
                    remapLSLReturnType(result),
                    remapLSLFuncArgs(args),
                ),
            ],
        };

        props[func.name] = func;
    }
    return {
        def: "table",
        name: "ll",
        props,
    };
}

function remapLSLFuncArgs(lslArgs: FuncArgs): SLuaFuncArgs {
    const args: SLuaFuncArgs = [];
    for (const lslArg of lslArgs) {
        args.push(
            newArg(
                lslArg.name,
                lslArg.desc,
                remapLSLArgType(lslArg.type),
            ),
        );
    }
    return args;
}

function remapLSLArgTypeLoose(
    type: string | null,
): SLuaType {
    let ntype = remapLSLArgTypeStrict(type);
    if (!(ntype instanceof Array)) ntype = [ntype];
    const otype = [];
    for (const i in ntype) {
        const nt = ntype[i];
        if (nt.def == "simple") {
            if (nt.value == "number" || nt.value == "boolean") {
                otype.push(newSimpleType("numeric"));
                continue;
            }
        }
        otype.push(nt);
    }
    const rtype: SLuaType = [];
    const seen = new Set();
    for (const ot of otype) {
        const k = `${ot.def}::${ot.value}`;
        if (!seen.has(k)) {
            seen.add(k);
            rtype.push(ot);
        }
    }
    return rtype.length > 1 ? rtype : rtype[0];
}

function remapLSLArgTypeStrict(
    rtype: string | null,
): SLuaType {
    const type = remapLSLType(rtype);
    if (type.def == "simple") {
        if (type.value == "uuid") {
            return castTypeArray([uuid, "string"]);
        }
    }
    return type;
}

function remapLSLReturnType(rtype: string | null): SLuaType {
    const type = remapLSLType(rtype);
    switch (type) {
        // case integer:
        //   return `number`;
        default:
            return type;
    }
}

function remapLSLConstType(rtype: string | null): SLuaBaseType {
    const type = remapLSLType(rtype);
    switch (type) {
        // case integer:
        //   return "number";
        default:
            return type;
    }
}

function remapLSLType(type: string | null): SLuaBaseType {
    const t = __remapLSLType(type);
    return castType(t);
}

function __remapLSLType(type: string | null): SLuaSimpleTypeValue {
    switch (type) {
        case "integer":
            // return integer;
        case "float":
            return "number";
        case "void":
            return "()";
        case "list":
            return "list";
        case "rotation":
            return quaternion;
        case "null":
            return "nil";
        case "key":
            return uuid;
        case "string":
            return "string";
        case "vector":
            return "vector";
        default:
            console.trace();
            throw `Unknown Type ${type}`;
    }
}
