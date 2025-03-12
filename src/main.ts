import { SAXParser } from "https://jsr.io/@maxim-mazurok/sax-ts/1.2.13/src/sax.ts";
import { isMap, Map, Node, node } from "./common.ts";
import { buildDefs, buildDocs } from "./luau-lsp-gen.ts";
import { buildDefs as buildSelene } from "./selene-gen.ts";

const strict: boolean = true; // change to false for HTML parsing
const options: {} = {}; // refer to "Arguments" section
const parser = new SAXParser(strict, options);

let depth = 0;

let LLSD: Node | null = null;

const tag_depth: Node[] = [];

const lastNode = (): Node | null => {
  return tag_depth[tag_depth.length - 1] ?? null;
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

const file = await Deno.readTextFile(Deno.args[0]);

parser.write(file).close();

const output_type = Deno.args[1] ?? "defs";

if (LLSD) {
  const map = LLSD.child(0);
  if (isMap(map)) {
    switch (output_type) {
      case "defs":
      case "luau-lsp-defs":
        buildDefs(map);
        break;
      case "docs":
      case "luau-lsp-docs":
        buildDocs(map);
        break;
      case "selene":
      case "sele":
        buildSelene(map);
        break;
    }
  }
}
