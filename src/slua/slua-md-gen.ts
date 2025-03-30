import { ensureDir } from "jsr:@std/fs";
import * as path from "jsr:@std/path";
import Template, { CompiledFunction } from "../template.ts";
import {
  buildSluaJson,
  SLuaConstDef,
  SLuaDef,
  SLuaFuncDef,
  SLuaGlobal,
  SLuaGlobalTable,
  SLuaGlobalTableProps,
} from "./slua-json-gen.ts";
import {
  generateCombinedDefinition,
  generatePreferedCodeSample,
} from "./slua-common.ts";
// import { create as markdown } from "npm:markdown-to-html-cli";
import { generate as markdown } from "../markdown-2-html.ts";

type TemplateTable = { [k: string]: CompiledFunction | TemplateTable };

let _templates: TemplateTable = {};
const tpl = new Template({
  isEscape: false,
});

async function loadTemplates(dir: string[]): Promise<TemplateTable> {
  const dirPath = path.join(import.meta.dirname as string, ...dir);

  const readDir = Deno.readDir(dirPath);

  const templates: TemplateTable = {};

  for await (const entry of readDir) {
    if (entry.isFile && entry.name.endsWith(".tmpl")) {
      templates[entry.name.substring(0, entry.name.length - 5)] = tpl.compile(
        await Deno.readTextFile(
          path.join(dirPath, entry.name),
        ),
      );
    } else if (entry.isDirectory) {
      templates[entry.name] = await loadTemplates([...dir, entry.name]);
    }
  }
  return templates;
}

async function getCustomTemplate(
  type: string[] | string,
  name: string,
): Promise<CompiledFunction | false> {
  type = type instanceof Array ? type : [type];
  try {
    const tpath = type.length ? [...type, name] : [name];
    const cpath = path.join("docs", "custom", "slua", ...tpath);
    const custom = await Deno.readTextFile(
      cpath.endsWith(".md") ? cpath : `${cpath}.md`,
    );
    return tpl.compile(custom);
  } catch (_e) {
    return false;
  }
}

function getTemplate(opath: string[]): CompiledFunction {
  let path = [...opath];
  if (!path[path.length - 1].endsWith(".md")) {
    path[path.length - 1] += ".md";
  }
  path = path.reverse();
  let templates: TemplateTable | CompiledFunction = _templates;
  while (path.length) {
    if (typeof templates == "function") {
      throw `Early template ${JSON.stringify(opath)}`;
    }
    templates = templates[path.pop() as string] ?? null;
    if (templates == null) throw `Unknown template ${JSON.stringify(opath)}`;
  }
  if (typeof templates == "function") {
    return templates;
  }
  throw `Didn't reach template ${JSON.stringify(opath)}`;
}

let output_dir: string[] = [];
let html_dir: string[] = [];

export async function generateSLuaMarkdown(
  keywords: string,
  outputDir: string,
  htmlDir: string,
): Promise<void> {
  const slua = await buildSluaJson(keywords);
  _templates = await loadTemplates(["templates"]);

  output_dir = [outputDir, "slua"];
  html_dir = [htmlDir, "slua"];

  await ensureDir(path.join(...output_dir));
  await ensureDir(path.join(...html_dir));

  await generateGlobals(slua.global);
}

async function output(
  title: string,
  file_path: string[],
  content: string,
): Promise<void> {
  const mdpath = path.join(...[...output_dir, ...file_path]) + ".md";
  await ensureDir(path.dirname(mdpath));

  await Deno.writeTextFile(
    mdpath,
    content,
  );
  const htpath = path.join(...[...html_dir, ...file_path]) + ".html";
  await ensureDir(path.dirname(htpath));
  await Deno.writeTextFile(
    htpath,
    markdown(title, content, {
      corners: "https://github.com/WolfGangS/sl_lua_types",
    }),
  );
}

async function generateGlobals(globals: SLuaGlobal) {
  for (const k in globals) {
    const global = globals[k];
    await generateGlobal([], global);
  }
  await generateIndex(globals);
}

async function generateGlobal(
  section: string[],
  global: SLuaDef | SLuaGlobalTable,
) {
  switch (global.def) {
    case "table":
      await generateTable([...section], global);
      for (const sub in global.props) {
        await generateGlobal(
          [...section, global.name],
          global.props[sub],
        );
      }
      break;
    case "func":
      await generateFunction(
        [...section],
        global,
      );
      break;
  }
}

async function generateFunction(
  section: string[],
  func: SLuaFuncDef,
) {
  const name = [...section, func.name].join(".");

  const fileName = `${name}`;

  const [sample, _sig] = generatePreferedCodeSample(section, func);

  const template = (await getCustomTemplate("functions", fileName)) ||
    getTemplate(["functions", "main.md"]);
  const altTemplate = getTemplate(["functions", "_alternatives.md"]);
  const jsonTemplate = getTemplate(["functions", "_json.md"]);

  const data = {
    name: func.name,
    definition: generateCombinedDefinition(func),
    description: func.desc,
    example: sample,
    alternatives: "",
    sectionLink: section.length
      ? `[${section.join(".")}](../${section.join(".")}.html).`
      : "",
    section: section.join("."),
    officialURL: func.link ? `[Official Documentation](${func.link})` : "",
    sectionURL: `../${section.join(".")}.html`,
    json: tpl.renderCompiled(jsonTemplate, {
      json: JSON.stringify(func, null, 2),
    }),
  };
  await output(
    name,
    ["functions", fileName],
    tpl.renderCompiled(template, data),
  );
}

async function generateTable(
  section: string[],
  table: SLuaGlobalTable,
) {
  const name = [...section, table.name];

  const fileName = `${name.join(".")}`;

  const template = (await getCustomTemplate([], fileName)) ||
    getTemplate(["table"]);

  const props: SLuaGlobalTableProps = JSON.parse(
    JSON.stringify(table.props),
  );
  const funcs: SLuaFuncDef[] = [];
  const cons: SLuaConstDef[] = [];
  for (const key in props) {
    const elem = props[key];
    switch (elem.def) {
      case "const":
        cons.push(elem);
        break;
      case "func":
        funcs.push(elem);
        break;
      default:
        throw "AAAAAAAAA WHAT DO";
    }
  }

  const data = {
    name: name.join("."),
    description: `${name.join(".")} Table`,
    props: cons.length > 0 ? generatePropsTable(name, cons) : "",
    funcs: funcs.length > 0 ? generateFuncsTable(name, funcs) : "",
    section: section.length ? section.join(".") : "SLua",
    sectionURL: section.length ? section.join(".") + ".hmtl" : "index.html",
  };
  output(name.join("."), [fileName], tpl.renderCompiled(template, data));
}

function generatePropsTable(
  section: string[],
  cons: SLuaConstDef[],
): string {
  const lines: string[] = [];
  for (const con of cons) {
    const name = [...section, con.name];
    lines.push(
      `|${con.name}|[Link](functions/${name.join(".")}.html)|`,
    );
  }
  return tpl.renderCompiled(
    getTemplate(["_props.md"]),
    {
      props: lines.sort().join("\n"),
    },
  );
}

function generateFuncsTable(
  section: string[],
  funcs: SLuaFuncDef[],
): string {
  const lines: string[] = [];

  const funcn = funcs.map(
    (f) => [...section, f.name].join("."),
  );

  funcn.sort();

  const len = Math.ceil(funcn.length / 4.0);

  for (let i = 0; i < len; i++) {
    const func1 = funcn[i + (len * 0)] ?? false;
    const func2 = funcn[i + (len * 1)] ?? false;
    const func3 = funcn[i + (len * 2)] ?? false;
    const func4 = funcn[i + (len * 3)] ?? false;
    const link1 = func1 ? `[${func1}](functions/${func1}.html)` : "";
    const link2 = func2 ? `[${func2}](functions/${func2}.html)` : "";
    const link3 = func3 ? `[${func3}](functions/${func3}.html)` : "";
    const link4 = func4 ? `[${func4}](functions/${func4}.html)` : "";
    lines.push(
      `|${link1}|${link2}|${link3}|${link4}|`,
    );
  }

  //   for (const func of funcs) {
  //     const name = ;
  //     lines.push(
  //       `|${name.join(".")}|[Link](functions/${name.join(".")}.html)|`,
  //     );
  //   }
  return tpl.renderCompiled(
    getTemplate(["_funcs.md"]),
    {
      funcs: lines.join("\n"),
    },
  );
}

async function generateIndex(globals: SLuaGlobal) {
  const template = (await getCustomTemplate([], "index")) ||
    getTemplate(["index"]);

  const lines: string[] = [];

  const tabs = Object.values(globals).filter((g) => g.def == "table");

  const funcn = tabs.map(
    (t) => t.name,
  );

  funcn.sort();

  const len = Math.ceil(funcn.length / 4.0);

  for (let i = 0; i < len; i++) {
    const func1 = funcn[i + (len * 0)] ?? false;
    const func2 = funcn[i + (len * 1)] ?? false;
    const func3 = funcn[i + (len * 2)] ?? false;
    const func4 = funcn[i + (len * 3)] ?? false;
    const link1 = func1 ? `[${func1}](${func1}.html)` : "";
    const link2 = func2 ? `[${func2}](${func2}.html)` : "";
    const link3 = func3 ? `[${func3}](${func3}.html)` : "";
    const link4 = func4 ? `[${func4}](${func4}.html)` : "";
    lines.push(
      `|${link1}|${link2}|${link3}|${link4}|`,
    );
  }

  output(
    "SLua",
    ["index"],
    tpl.renderCompiled(template, {
      tables: lines.join("\n"),
    }),
  );
}
