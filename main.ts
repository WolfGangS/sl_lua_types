import { SAXParser } from "https://jsr.io/@maxim-mazurok/sax-ts/1.2.13/src/sax.ts";

const strict: boolean = true; // change to false for HTML parsing
const options: {} = {}; // refer to "Arguments" section
const parser = new SAXParser(strict, options);

let depth = 0;

let LLSD: Node | null = null;

class Node {
  protected node: node;
  protected elems: Node[] = [];
  protected _parent: Node | null;
  public text = "";

  constructor(node: node, parent: Node | null) {
    this.node = node;
    this._parent = parent;
  }

  toString(): string {
    return `[${this.node.name}:${this.text}]`;
  }

  isType(type: string): boolean {
    return this.type == type;
  }

  addNode(node: Node) {
    this.elems.push(node);
  }

  close(): void {
    this.parent?.addNode(this);
  }

  public get type(): string {
    return this.node.name;
  }
  public get parent(): Node | null {
    return this._parent;
  }

  child(index: number): Node | null {
    return this.elems[index];
  }

  get children(): Node[] {
    return [...this.elems];
  }
}

class Map extends Node {
  private kv: { [k: string]: Node } = {};

  override addNode(node: Node) {
    const last = this.elems[this.elems.length - 1];
    if (last) {
      //console.log("ADD TO MAP", node.type, node.text, last.type);
      if (last.isType("key")) {
        //console.log("KV: ", last.text, node.text);
        this.kv[last.text] = node;
      }
    }
    super.addNode(node);
  }

  override toString() {
    return `[${this.node.name}: ${
      Object.entries(this.kv).map((e) => `${e[0]}: ${e[1].text} (${e[1].type})`)
        .join(", ")
    } ]`;
  }

  get(key: string): Node | null {
    return this.kv[key] ?? null;
  }

  get content(): [string, Node][] {
    return Object.entries(this.kv);
  }
}

type node = {
  name: string;
  attributes: string[];
};

type map = node & {
  elems: node[];
};

const tag_depth: Node[] = [];

const lastNode = (): Node | null => {
  return tag_depth[tag_depth.length - 1] ?? null;
};

const isMap = (node: Node | null): node is Map => {
  return node != null && node.isType("map");
};

const inMap = (): boolean => {
  return isMap(lastNode());
};

const getMap = (): Map | null => {
  let i = tag_depth.length;
  while (i--) {
    const n = tag_depth[i];
    if (isMap(n)) return n;
  }
  return null;
};

parser.ontext = function (text: any) {
  const n = lastNode();
  if (n) n.text = text;
};

parser.onopentag = function (node: node) {
  const parent = lastNode();
  if (node.name == "map") {
    tag_depth.push(new Map(node, parent));
  } else {
    tag_depth.push(new Node(node, parent));
  }
  depth++;
};

parser.onclosetag = function () {
  const node = tag_depth.pop();
  if (node) {
    node.close();
    if (node.type == "llsd") LLSD = node;
  }
};

const file = await Deno.readTextFile(Deno.args[0]);

parser.write(file).close();

const output_type = Deno.args[1] ?? "defs";

if (LLSD) {
  const map = LLSD.child(0);
  if (isMap(map)) {
    if (output_type == "defs") {
      outputPreDef();
      outputConstDefs(map.get("constants") as Map);
      outputFunctionDefs(map.get("functions") as Map);
      outputEventDefs(map.get("events") as Map);
    } else if (output_type == "docs") {
      console.log(JSON.stringify(
        buildDocs(map),
        null,
        2,
      ));
    }
  }
}

type doc = {
  documentation: string;
  learn_more_link: string;
  code_sample?: string;
  returns?: string;
};

function buildDocs(map: Map) {
  const docs: { [k: string]: doc } = {};
  for (const func of (map.get("functions") as Map).content) {
    const [name, map] = func;
    if (!isMap(map)) continue;
    docs["@roblox/global/ll." + name.substring(2)] = {
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
    docs["@roblox/global/" + name] = {
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
    docs["@roblox/global/" + name] = {
      documentation: map.get("tooltip")?.text ?? "n./a",
      learn_more_link: `https://wiki.secondlife.com/wiki/${
        name.substring(0, 1).toUpperCase()
      }${name.substring(1)}`,
      //returns: (map.get("value")?.text ?? ""),
    };
  }
  return docs;
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

  console.log("type integer = number");
  console.log("type key = string");
  console.log("type quaternion = string");

  console.log("");

  console.log(
    "--declare function vector(x:number,y:number,z:number) : vector",
  );
  console.log(
    "declare function quaternion(x:number,y:number,z:number,w:number) : quaternion",
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
        args.push(name + ": " + remapLSLType(map.get("type")?.text));
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
      "    ",
      name.substring(2),
      ":",
      "(" + mapArgsArrayToTypes(map.get("arguments")).join(", ") + ")",
      "->",
      remapLSLType(map.get("return")?.text ?? "void"),
      ",",
    );
  }
  console.log("}");
}

function remapLSLType(type: string | null | undefined) {
  switch (type) {
    //    case "integer":
    case "float":
      return "number";
    case "void":
      return "()";
    case "list":
      return "{}";
    case "rotation":
      return "quaternion";
    case "null":
      return "nil";
    default:
      return type;
  }
}
