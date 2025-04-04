import { buildSluaJson, SLuaFuncArg } from "./slua-json-gen.ts";

type VSCodeSnippet = {
  scope: string;
  prefix: string;
  body: string[];
  description: string;
};

type VSCodeSnippets = {
  [key: string]: VSCodeSnippet;
};

export async function buildSluaVSCodeSnippets(
  file: string,
  strict: boolean = true,
): Promise<string> {
  const data = await buildSluaJson(file, strict);
  const snippets: VSCodeSnippets = {};

  for (const [name, prop] of Object.entries(data.global.props)) {
    if (prop.def === "event") {
      const args = prop.args?.map(formatArg).join(", ") ?? "";
      const functionSignature = `function ${name}(${args})`;
      
      snippets[name] = {
        scope: "luau",
        prefix: name,
        body: [functionSignature],
        description: prop.desc ?? `Triggered when ${name} occurs.`
      };
    }
  }

  return JSON.stringify(snippets, null, 2);
}

function formatArg(arg: SLuaFuncArg): string {
  const name = arg.name.replace(/(?<!^)([A-Z][a-z]+)/g, "_$1").toLowerCase();
  const type = arg.type.map(t => t).join(" | ");

  return `${simplifyName(name)}: ${type}`;
}

function simplifyName(name: string): string {
  switch (true) {
    case name.endsWith("id"):
      return "id";
    case name.startsWith("number_of_"):
      return name.replace("number_of_", "");
    case name.startsWith("http_"):
      return name.replace("http_", "");
    case name.startsWith("start_"):
      return name.replace("start_", "");
    case name.startsWith("senders_"):
      return name.replace("senders_", "");
    default:
      return name;
  }
}
