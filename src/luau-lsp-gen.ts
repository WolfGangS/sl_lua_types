import { isMap, Map, Node } from "./common.ts";

type doc = {
  documentation: string;
  learn_more_link: string;
  code_sample?: string;
  returns?: string;
};

const quaternion = "quaternion";
const uuid = "uuid";
const integer = "integer";

const prefix = "@secondlife";

export function buildDefs(map: Map) {
  outputPreDef();
  outputConstDefs(map.get("constants") as Map);
  outputFunctionDefs(map.get("functions") as Map);
  outputEventDefs(map.get("events") as Map);
}

export function buildDocs(map: Map) {
  const docs: { [k: string]: doc } = {
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

  for (const func of (map.get("functions") as Map).content) {
    const [name, map] = func;
    if (!isMap(map)) continue;
    docs[`${prefix}/global/ll.${name.substring(2)}`] = {
      documentation: map.get("tooltip")?.text ?? "n./a",
      learn_more_link: `https://wiki.secondlife.com/wiki/${
        name.substring(0, 1).toUpperCase()
      }${name.substring(1)}`,
      code_sample: generateCodeSample(name, map.get("arguments")),
    };
  }
  for (const func of (map.get("constants") as Map).content) {
    const [name, map] = func;
    if (!isMap(map)) continue;
    if (name == "default") continue;
    docs[`${prefix}/global/${name}`] = {
      documentation: (map.get("value")?.text ?? "") + " : " +
        (map.get("tooltip")?.text ?? "n./a"),
      learn_more_link: `https://wiki.secondlife.com/wiki/${name}`,
      code_sample: name,
      //returns: (map.get("value")?.text ?? ""),
    };
  }
  for (const func of (map.get("events") as Map).content) {
    const [name, map] = func;
    if (!isMap(map)) continue;
    if (name == "default") continue;
    docs[`${prefix}/global/${name}`] = {
      documentation: map.get("tooltip")?.text ?? "n./a",
      learn_more_link: `https://wiki.secondlife.com/wiki/${
        name.substring(0, 1).toUpperCase()
      }${name.substring(1)}`,
      //returns: (map.get("value")?.text ?? ""),
    };
  }
  console.log(JSON.stringify(
    docs,
    null,
    2,
  ));
}

function generateCodeSample(name: string, argArray: Node | null) {
  const args = [];

  if (argArray && argArray.type == "array") {
    for (const argMap of argArray.children) {
      if (!isMap(argMap)) continue;
      if (argMap.content.length > 1) {
        console.warn(argMap.toString(), "LONG");
        continue;
      }
      for (const arg of argMap.content) {
        const [_name, map] = arg;
        if (!isMap(map)) continue;
        switch (map.get("type")?.text) {
          case "rotation":
            args.push("quaternion(0,0,0,1)");
            break;
          case "integer":
            args.push("1");
            break;
          case "float":
            args.push("3.14");
            break;
          case "list":
            args.push("{}");
            break;
          case "key":
            args.push("key('')");
            break;
          case "vector":
            args.push("vector.create(1,1,1)");
            break;
          case "string":
            args.push("'test'");
            break;
          default:
            args.push("nil");
            break;
        }
      }
    }
  }

  return `ll.${name.substring(2)}(${args.join(", ")})`;
}

function outputPreDef() {
  console.log("");
  console.log("----------------------------------");
  console.log("---------- LSL LUAU DEFS ---------");
  console.log("----------------------------------");
  console.log("");

  console.log(`-- type ${integer} = number`);
  console.log("-- type UUID = string");

  console.log("");

  console.log(
    `declare class ${integer}
  function __add(self, other: ${integer}): ${integer}
  function __add(self, other: number): number
  function __sub(self, other: ${integer}): ${integer}
  function __sub(self, other: number): number
  function __mul(self, other: ${integer}): ${integer}
  function __mul(self, other: number): number
  function __div(self, other: ${integer}): ${integer}
  function __div(self, other: number): number
  function __unm(self): ${integer}
  function __mod(self, outher: ${integer}): ${integer}
  function __mod(self, outher: number): number
  function __pow(self, outher: ${integer}): number
  function __pow(self, outher: number): number
  function __idiv(self, outher: ${integer}): ${integer}
  function __idiv(self, outher: number): number
  function __eq(self, other: ${integer}): boolean
  function __lt(self, other: ${integer}): boolean
  function __le(self, other: ${integer}): boolean
end`,
  );

  console.log("");

  console.log(
    `declare class ${uuid}
  function __tostring(self): string
end`,
  );

  console.log("");

  console.log(
    `declare bit32: {
  arshift: ((n:integer, i:integer) -> integer) & ((n: integer | number, i: integer | number) -> number),
  band: ((...integer) -> integer) & ((...(integer | number)) -> number),
  bnot: ((n:integer) -> integer) & ((n: integer | number) -> number),
  bor: ((...integer) -> integer) & ((...(integer | number)) -> number),
  bxor: ((...integer) -> integer) & ((...(integer | number)) -> number),
  btest: (...(integer | number)) -> boolean,
  extract: ((n: integer, f: integer, w: integer)->integer) & ((n: integer | number, f: integer | number, w: integer | number) -> number),
  lrotate: ((n: integer, i: integer) -> integer) & ((n: integer | number, i: integer | number) -> number),
  lshift: ((n: integer, i: integer) -> integer) & ((n: integer | number, i: integer | number) -> number),
  replace: ((n: integer, r: integer, f: integer, w: integer?) -> integer) & ((n: integer | number, r: integer | number, f: integer | number, w: (integer|number)?) -> number),
  rrotate: ((n: integer, i: integer) -> integer) & ((n: integer | number, i: integer | number) -> number),
  rshift: ((n: integer, i: integer) -> integer) & ((n: integer | number, i: integer | number) -> number),
  countlz: ((n: integer) -> integer) & ((n: number) -> integer),
  countrz: ((n: integer) -> integer) & ((n: number) -> integer),
  byteswap: ((n: integer) -> integer) & ((n: number) -> integer),
}`,
  );

  console.log("");

  console.log(
    `declare class ${quaternion}
  x: number
  y: number
  z: number
  w: number
end`,
  );

  console.log("");

  console.log(
    `declare function quaternion (x:number, y:number, z:number, w:number) : ${quaternion}`,
  );
  console.log(
    `declare function integer (i:number) : ${integer}`,
  );
  console.log(
    `declare function uuid (str:string) : ${uuid}`,
  );

  console.log("");

  console.log(
    "--declare function vector(x:number,y:number,z:number) : vector",
  );
}

function outputConstDefs(consts: Map) {
  console.log("");
  console.log("----------------------------------");
  console.log("----------- CONSTANTS ------------");
  console.log("----------------------------------");
  console.log("");
  for (const entry of consts.content) {
    const [name, map] = entry;
    if (!isMap(map)) continue;
    if (name == "default") continue;
    console.log(
      "declare",
      name,
      ":",
      remapLSLType(map.get("type")?.text ?? null),
    );
  }
}

function outputEventDefs(events: Map) {
  console.log("");
  console.log("----------------------------------");
  console.log("------------- EVENTS -------------");
  console.log("----------------------------------");
  console.log("");
  for (const entry of events.content) {
    const [name, map] = entry;
    if (!isMap(map)) continue;
    console.log(
      "declare function",
      name,
      "(" + mapArgsArrayToTypes(map.get("arguments")).join(", ") + ")",
      ":",
      "()",
    );
  }
}

function mapArgsArrayToTypes(argArray: Node | null) {
  const args: string[] = [];
  if (argArray && argArray.type == "array") {
    for (const argMap of argArray.children) {
      if (!isMap(argMap)) continue;
      if (argMap.content.length > 1) {
        console.warn(argMap.toString(), "LONG");
        continue;
      }
      for (const arg of argMap.content) {
        const [name, map] = arg;
        if (!isMap(map)) continue;
        args.push(name + ": " + remapLSLArgType(map.get("type")?.text));
      }
    }
  }
  return args;
}

function outputFunctionDefs(funcs: Map) {
  console.log("");
  console.log("----------------------------------");
  console.log("----------- FUNCTIONS ------------");
  console.log("----------------------------------");
  console.log("");
  console.log("declare ll: {");
  for (const entry of funcs.content) {
    const [name, map] = entry;
    if (!isMap(map)) continue;
    console.log(
      " ",
      name.substring(2),
      ":",
      "(" + mapArgsArrayToTypes(map.get("arguments")).join(", ") + ")",
      "->",
      remapLSLReturnType(map.get("return")?.text ?? "void"),
      ",",
    );
  }
  console.log("}");
}

function remapLSLReturnType(type: string | null | undefined) {
  type = remapLSLType(type);
  switch (type) {
    case integer:
      return `number`;
    default:
      return type;
  }
}

function remapLSLArgType(type: string | null | undefined) {
  type = remapLSLType(type);
  switch (type) {
    case integer:
      return `${integer}|number`;
    case uuid:
      return `${uuid}|string`;
    default:
      return type;
  }
}

function remapLSLType(type: string | null | undefined) {
  switch (type) {
    case "integer":
      return integer;
    case "float":
      return "number";
    case "void":
      return "()";
    case "list":
      return "{}";
    case "rotation":
      return quaternion;
    case "null":
      return "nil";
    case "key":
      return uuid;
    default:
      return type;
  }
}
