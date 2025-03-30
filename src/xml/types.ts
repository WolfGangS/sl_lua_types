export type node = {
  name: string;
  attributes: string[];
};

export type map = node & {
  elems: node[];
};

export const isMap = (node: Node | null): node is Map => {
  return node != null && node.isType("map");
};

export class Node {
  protected node: node;
  protected elems: Node[] = [];
  protected _parent: Node | null;
  public text = "";

  constructor(node: node, parent: Node | null = null) {
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

export class Map extends Node {
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
