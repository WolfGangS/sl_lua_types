import { buildLSLJson, LSLDef } from "../lsl/lsl-json-gen.ts";
import {
  ConstDef,
  ConstDefs,
  EventDef,
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
const integer = "integer";

export type SLuaBaseType =
  | "string"
  | "boolean"
  | "number"
  | "vector"
  | "buffer"
  | "{}"
  | "integer"
  | "quaternion"
  | "uuid"
  | "nil"
  | "list"
  | "self"
  | "any"
  | "()"
  | "numeric"
  | SLuaFuncSig
  | { custom: string }
  | { value: string | number };
//  | string
// | null;

export type SLuaType = SLuaBaseType | SLuaBaseType[];

export type SLuaFuncResult = {
  def: "result";
  desc: string;
} & NamedVarOpType;

export type SLuaFuncSig = {
  args: SLuaFuncArgs;
  result: SLuaFuncResult[];
};

export type SLuaFuncDef = Omit<FuncDef, "args" | "result"> & {
  signatures: SLuaFuncSig[];
};
export type SLuaConstDef = Omit<ConstDef, "type"> & { type: SLuaBaseType };
export type SLuaEventDef = Omit<EventDef, "args"> & { args: SLuaFuncArgs };
export type SLuaTypeDef = TypeDef & { type: string };

export type NamedVarOpType = { name: string } & VarOpType;

export type VarOpType = {
  type: SLuaBaseType[];
  variadic: boolean;
  optional: boolean;
};

export type SLuaFuncArg = Omit<FuncArg, "type"> & VarOpType;
export type SLuaFuncArgs = SLuaFuncArg[];

export type SLuaDef = SLuaFuncDef | SLuaConstDef | SLuaEventDef | SLuaClassDef;

export type SLuaClassDef = {
  def: "class";
  name: string;
  funcs: StrObj<SLuaFuncDef>;
  props: StrObj<SLuaConstDef>;
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

type SLua = {
  global: SLuaGlobalTable;
  types: StrObj<SLuaTypeDef>;
  classes: StrObj<SLuaClassDef>;
};

let remapLSLArgType: (
  type: string | null,
) => SLuaType = remapLSLArgTypeStrict;

export async function buildSluaJson(
  file: string,
  strict: boolean = true,
): Promise<SLua> {
  if (!strict) remapLSLArgType = remapLSLArgTypeLoose;
  const lsl = await buildLSLJson(file);
  const slua: SLua = {
    global: {
      def: "table",
      name: "SLua",
      props: {
        ...builtInSluaFuncs(),
        ...builtInSluaTables(),
        ...buildSLuaGlobalsFromLSL(lsl),
        ...buildSLuaEventsFromLSL(lsl.events),
        ...buildSLuaConstsFromLSL(lsl.constants),
      },
    },
    types: builtInSluaTypes(),
    classes: builtInSluaClasses(),
  };

  applyPatches(slua, overides);

  return slua;
}

function newFunc(
  name: string,
  desc: string,
  link: string,
  results: SLuaFuncSig[] = [],
): SLuaFuncDef {
  return {
    def: "func",
    name,
    energy: 0,
    pure: true,
    sleep: 0,
    signatures: results,
    desc,
    link,
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

function newResult(
  name: string,
  type: SLuaBaseType | SLuaBaseType[],
  desc: string = "",
  variadic: boolean = false,
  optional: boolean = false,
): SLuaFuncResult {
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
  result: SLuaBaseType | SLuaBaseType[],
  args: SLuaFuncArgs = [],
) {
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
    result,
    args,
  };
}
function newOArg(name: string, desc: string, type: SLuaType): SLuaFuncArg {
  return newArg(name, desc, type, false, true);
}

function newVArg(name: string, desc: string, type: SLuaType): SLuaFuncArg {
  return newArg(name, desc, type, true);
}

function _newOVArg(name: string, desc: string, type: SLuaType): SLuaFuncArg {
  return newArg(name, desc, type, true, true);
}

function newArg(
  name: string,
  desc: string,
  btype: SLuaType,
  variadic: boolean = false,
  optional: boolean = false,
): SLuaFuncArg {
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

function newConst(
  name: string,
  desc: string,
  type: SLuaBaseType,
): SLuaConstDef {
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
    "_NAME": newConst("_NAME", "Name of the lljson table", {
      value: '"lljson"',
    }),
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
      { custom: "lljson_constant" },
    ),
    null: newConst(
      "null",
      "A constant to pass for null to json encode",
      { custom: "lljson_constant" },
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
              "integer",
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
          "integer",
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
              { value: "true" },
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
              { value: "false" },
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
            newArg("x", "x value of vector", ["number", "integer"]),
            newArg("y", "y value of vector", ["number", "integer"]),
            newArg("z", "z value of vector", ["number", "integer"]),
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
          "integer",
          [
            newArg("n", "number to be shifted", "integer"),
            newArg("i", "bits to shift by", "integer"),
          ],
        ),
        newSFuncSignature(
          "number",
          [
            newArg("n", "number to be shifted", ["integer", "number"]),
            newArg("i", "bits to shift by", ["integer", "number"]),
          ],
        ),
      ],
    ),
    band: newBFunc(
      "band",
      "Performs a bitwise and of all input numbers and returns the result.\nIf the function is called with no arguments, an integer with all bits set to `1` is returned.",
      [
        newSFuncSignature(
          "integer",
          [
            newVArg("args", "integers to and together", "integer"),
          ],
        ),
        newSFuncSignature(
          "number",
          [
            newVArg("args", "numbers to and together", ["integer", "number"]),
          ],
        ),
      ],
    ),
    bnot: newBFunc(
      "bnot",
      "Returns a bitwise negation of the input number.",
      [
        newSFuncSignature(
          "integer",
          [
            newArg("n", "integers to not", "integer"),
          ],
        ),
        newSFuncSignature(
          "number",
          [
            newArg("n", "number to not", ["integer", "number"]),
          ],
        ),
      ],
    ),
    bor: newBFunc(
      "bor",
      "Performs a bitwise or of all input numbers and returns the result.\nIf the function is called with no arguments, `0` is returned.",
      [
        newSFuncSignature(
          "integer",
          [
            newVArg("args", "integers to or together", "integer"),
          ],
        ),
        newSFuncSignature(
          "number",
          [
            newVArg("args", "numbers to or together", ["integer", "number"]),
          ],
        ),
      ],
    ),
    bxor: newBFunc(
      "bxor",
      "Performs a bitwise xor (exclusive or) of all input numbers and returns the result.\nIf the function is called with no arguments, `0` is returned.",
      [
        newSFuncSignature(
          "integer",
          [
            newVArg("args", "integers to xor together", "integer"),
          ],
        ),
        newSFuncSignature(
          "number",
          [
            newVArg("args", "numbers to xor together", ["integer", "number"]),
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
            newVArg("args", "values to test together", ["integer", "number"]),
          ],
        ),
      ],
    ),
    extract: newBFunc(
      "extract",
      "Extracts bits of `n` at position `f` with `a` width of `w`, and returns the resulting integer.\n`w` defaults to 1, so a two-argument version of extract returns the bit value at position `f`.\nBits are indexed starting at `0`.\nErrors if `f` and `f+w-1` are not between `0` and `31`.",
      [
        newSFuncSignature(
          "integer",
          [
            newArg("n", "", "integer"),
            newArg("f", "", "integer"),
            newArg("w", "", "integer"),
          ],
        ),
        newSFuncSignature(
          "number",
          [
            newArg("n", "", ["integer", "number"]),
            newArg("f", "", ["integer", "number"]),
            newArg("w", "", ["integer", "number"]),
          ],
        ),
      ],
    ),
    lrotate: newBFunc(
      "lrotate",
      "Rotates `n` to the left by `i` bits (if `i` is negative, a right rotate is performed instead)\nThe bits that are shifted past the bit width are shifted back from the right.",
      [
        newSFuncSignature(
          "integer",
          [
            newArg("n", "", "integer"),
            newArg("i", "", "integer"),
          ],
        ),
        newSFuncSignature(
          "number",
          [
            newArg("n", "", ["integer", "number"]),
            newArg("i", "", ["integer", "number"]),
          ],
        ),
      ],
    ),
    lshift: newBFunc(
      "lshift",
      "Shifts `n` to the left by `i` bits (if `i` is negative, a right shift is performed instead).\nWhen `i` is outside of `[-31..31]` range, returns `0`.",
      [
        newSFuncSignature(
          "integer",
          [
            newArg("n", "", "integer"),
            newArg("i", "", "integer"),
          ],
        ),
        newSFuncSignature(
          "number",
          [
            newArg("n", "", ["integer", "number"]),
            newArg("i", "", ["integer", "number"]),
          ],
        ),
      ],
    ),
    replace: newBFunc(
      "replace",
      "Replaces bits of `n` at position `f` and width `w` with `r`, and returns the resulting integer.\n`w` defaults to `1`, so a three-argument version of replace changes one bit at position `f` to `r` (which should be `0` or `1`) and returns the result.\nBits are indexed starting at `0`.\nErrors if `f` and `f+w-1` are not between `0` and `31`.",
      [
        newSFuncSignature(
          "integer",
          [
            newArg("n", "", "integer"),
            newArg("r", "", "integer"),
            newArg("f", "", "integer"),
            newOArg("w", "", "integer"),
          ],
        ),
        newSFuncSignature(
          "number",
          [
            newArg("n", "", ["integer", "number"]),
            newArg("r", "", ["integer", "number"]),
            newArg("f", "", ["integer", "number"]),
            newOArg("w", "", ["integer", "number"]),
          ],
        ),
      ],
    ),
    rrotate: newBFunc(
      "rrotate",
      "Rotates `n` to the right by `i` bits (if `i` is negative, a left rotate is performed instead)\nThe bits that are shifted past the bit width are shifted back from the left.",
      [
        newSFuncSignature(
          "integer",
          [
            newArg("n", "", "integer"),
            newArg("i", "", "integer"),
          ],
        ),
        newSFuncSignature(
          "number",
          [
            newArg("n", "", ["integer", "number"]),
            newArg("i", "", ["integer", "number"]),
          ],
        ),
      ],
    ),
    rshift: newBFunc(
      "rshift",
      "Shifts `n` to the right by `i` bits (if `i` is negative, a left shift is performed instead).\nWhen `i` is outside of `[-31..31]` range, returns `0`.",
      [
        newSFuncSignature(
          "integer",
          [
            newArg("n", "", "integer"),
            newArg("i", "", "integer"),
          ],
        ),
        newSFuncSignature(
          "number",
          [
            newArg("n", "", ["integer", "number"]),
            newArg("i", "", ["integer", "number"]),
          ],
        ),
      ],
    ),
    countlz: newBFunc(
      "countlz",
      "Returns the number of consecutive zero bits in the 32-bit representation of `n` starting from the left-most (most significant) bit.\nReturns `32` if `n` is `0`.",
      [
        newSFuncSignature(
          "integer",
          [
            newArg("n", "", "integer"),
          ],
        ),
        newSFuncSignature(
          "number",
          [
            newArg("n", "", ["integer", "number"]),
          ],
        ),
      ],
    ),
    countrz: newBFunc(
      "countrz",
      "Returns the number of consecutive zero bits in the 32-bit representation of `n` starting from the right-most (least significant) bit.\nReturns `32` if `n` is `0`.",
      [
        newSFuncSignature(
          "integer",
          [
            newArg("n", "", "integer"),
          ],
        ),
        newSFuncSignature(
          "number",
          [
            newArg("n", "", ["integer", "number"]),
          ],
        ),
      ],
    ),
    byteswap: newBFunc(
      "byteswap",
      "Returns n with the order of the bytes swapped.",
      [
        newSFuncSignature(
          "integer",
          [
            newArg("n", "", "integer"),
          ],
        ),
        newSFuncSignature(
          "number",
          [
            newArg("n", "", ["integer", "number"]),
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

function builtInSluaTypes(): StrObj<SLuaTypeDef> {
  return {
    "numeric": {
      name: "numeric",
      desc:
        "numeric type to genericize for functions that accept any numric type",
      type: "number|boolean|integer",
    },
    "list": {
      name: "list",
      desc:
        "a table type to try and restrict LL functions that only accept flat lists",
      type: "{[number]:(string|number|integer|vector|uuid|quaternion|boolean)}",
    },
    "lljson_constant": {
      name: "lljson_constant",
      desc: "A set of constants for changing json encode output",
      type: "number",
    },
  };
}

function builtInSluaFuncs(): StrObj<SLuaFuncDef> {
  return {
    [integer]: newNoUrlFunc(integer, "Creates an integer value from argument", [
      newSFuncSignature(integer, [
        newArg(
          "value",
          "value to be convetered to an integer",
          ["string", "number"],
        ),
      ]),
    ]),
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
    result: SLuaBaseType | SLuaBaseType[],
    arg: SLuaType,
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
      istruthy: newConst(
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
      x: newConst(
        "x",
        `x property of ${quaternion}`,
        "number",
      ),
      y: newConst(
        "y",
        `y property of ${quaternion}`,
        "number",
      ),
      z: newConst(
        "z",
        `z property of ${quaternion}`,
        "number",
      ),
      s: newConst(
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
      x: newConst(
        "x",
        `x property of vector`,
        "number",
      ),
      y: newConst(
        "y",
        `y property of vector`,
        "number",
      ),
      z: newConst(
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
  const iSelfNI = [
    newSelfFuncSig(integer, integer),
    newSelfFuncSig("number", "number"),
  ];
  classes[integer] = {
    def: "class",
    name: integer,
    props: {},
    funcs: {
      "__add": newNoUrlFunc(
        "__add",
        "Meta function to allow for '+' operation",
        iSelfNI,
      ),
      "__sub": newNoUrlFunc(
        "__sub",
        "Meta function to allow for '-' operation",
        iSelfNI,
      ),
      "__mul": newNoUrlFunc(
        "__mul",
        "Meta function to allow for '*' operation",
        iSelfNI,
      ),
      "__div": newNoUrlFunc(
        "__div",
        "Meta function to allow for '/' operation",
        [
          newSelfFuncSig("number", integer),
          newSelfFuncSig("number", "number"),
        ],
      ),
      "__unm": newNoUrlFunc(
        "__unm",
        "Meta function to allow for '-' negation",
        [
          newSFuncSignature("integer", [selfArg]),
        ],
      ),
      "__mod": newNoUrlFunc(
        "__mod",
        "Meta function to allow for '%' operation",
        iSelfNI,
      ),
      "__pow": newNoUrlFunc(
        "__pow",
        "Meta function to allow for '^' operation",
        iSelfNI,
      ),
      "__idiv": newNoUrlFunc(
        "__idiv",
        "Meta function to allow for '//' operation",
        iSelfNI,
      ),
      "__eq": newNoUrlFunc(
        "__eq",
        "Meta function to allow for '==' operation",
        [
          newSFuncSignature("integer", [
            selfArg,
            newArg("other", "", "integer"),
          ]),
        ],
      ),
      "__lt": newNoUrlFunc(
        "__lt",
        "Meta function to allow for '<' and '>' operation",
        [
          newSFuncSignature("integer", [
            selfArg,
            newArg("other", "", "integer"),
          ]),
        ],
      ),
      "__le": newNoUrlFunc(
        "__le",
        "Meta function to allow for '<=' and '>=' operation",
        [
          newSFuncSignature("integer", [
            selfArg,
            newArg("other", "", "integer"),
          ]),
        ],
      ),
    },
  };
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

function buildSLuaEventsFromLSL(lslEvents: EventDefs): StrObj<SLuaEventDef> {
  const events: StrObj<SLuaEventDef> = {};
  for (const key in lslEvents) {
    const lslEvent = lslEvents[key];
    if (lslEvent.name.startsWith("state_")) continue;
    const event: SLuaEventDef = {
      def: "event",
      name: lslEvent.name,
      args: remapLSLFuncArgs(lslEvent.args),
      desc: lslEvent.desc,
      link: lslEvent.link,
    };
    events[event.name] = event;
  }
  return Object.keys(events).sort().reduce(
    (obj: StrObj<SLuaEventDef>, key): StrObj<SLuaEventDef> => {
      obj[key] = events[key];
      return obj;
    },
    {},
  );
}

function buildSLuaGlobalsFromLSL(lsl: LSLDef): SLuaGlobal {
  const global: SLuaGlobal = {
    ll: buildSLuaLLFuncsFromLSL(lsl.functions),
  };
  return global;
}

function buildSLuaLLFuncsFromLSL(lslFuncs: FuncDefs): SLuaGlobalTable {
  const props: SLuaGlobalTableProps = {};
  for (const key in lslFuncs) {
    const { name, result, args, ...lslFunc } = lslFuncs[key];
    const func: SLuaFuncDef = {
      ...lslFunc,
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
  const ntype = remapLSLArgTypeStrict(type);
  switch (ntype) {
    case "integer":
    case "number":
    case "boolean":
      return "numeric" as SLuaType;
    default:
      return ntype;
  }
}

function remapLSLArgTypeStrict(
  rtype: string | null,
): SLuaType {
  const type = remapLSLType(rtype);
  switch (type) {
    case integer:
      return [integer, "number"];
    case uuid:
      return [uuid, "string"];
    default:
      return type as SLuaBaseType;
  }
}

function remapLSLReturnType(rtype: string | null): SLuaType {
  const type = remapLSLType(rtype);
  switch (type) {
    case integer:
      return `number`;
    default:
      return type as SLuaType;
  }
}

function remapLSLConstType(rtype: string | null): SLuaBaseType {
  const type = remapLSLType(rtype);
  switch (type) {
    case "integer":
      return "number";
    default:
      return type;
  }
}

function remapLSLType(type: string | null): SLuaBaseType {
  switch (type) {
    case "integer":
      return integer;
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
