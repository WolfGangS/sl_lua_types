import { ensureDir } from "@std/fs";
import * as path from "@std/path";
// @deno-types="npm:@types/ejs"
import ejs from "ejs";
import {
    buildSluaJson,
    SLua,
    SLuaClassDef,
    SLuaConstDef,
    SLuaDef,
    SLuaFuncDef,
    SLuaGlobal,
    SLuaGlobalTable,
    SLuaGlobalTableProps,
} from "./slua-json-gen.ts";
import {
    classDefToTableDef,
    generatePreferedCodeSample,
    generateStringDefinitions,
    isTypeCustom,
} from "./slua-common.ts";
// import { create as markdown } from "npm:markdown-to-html-cli";
import { generate as markdown } from "../markdown-2-html.ts";
import { StrObj } from "../types.d.ts";
import { LSLDef } from "../xml/xml-lsl-json-gen.ts";

const import_dirname = import.meta.dirname;

if (typeof import_dirname != "string") {
    throw new Error("Failed to get import dir");
}

const templatePath = path.join(
    import_dirname,
    "..",
    "..",
    "templates",
    "slua",
);

const ejsCache: { [k: string]: string } = {};

ejs.fileLoader = function (filePath) {
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(templatePath)) {
        throw new Error("Bad template");
    }
    if (ejsCache[resolvedPath]) return ejsCache[resolvedPath];
    ejsCache[resolvedPath] = Deno.readTextFileSync(
        resolvedPath + (resolvedPath.endsWith(".ejs") ? "" : ".ejs"),
    );
    return ejsCache[resolvedPath];
};

async function getCustomMarkdown(
    type: string[] | string,
    name: string,
): Promise<string | false> {
    type = type instanceof Array ? type : [type];
    try {
        const tpath = type.length ? [...type, name] : [name];
        const cpath = path.join("docs", "custom", "slua", ...tpath);
        const custom = await Deno.readTextFile(
            cpath.endsWith(".md") ? cpath : `${cpath}.md`,
        );
        return custom;
    } catch (_e) {
        return false;
    }
}

function prepSlua(slua: SLua) {
    for (const pKey in slua.global.props) {
        const prop = slua.global.props[pKey];
        if (prop.def == "const") {
            if (prop.type.def == "custom") {
                const type = slua.types[prop.type.value] || null;
                if (!type) continue;
                if (type instanceof Array) continue;
                if (type.type.def == "class") {
                    slua.global.props[pKey] = classDefToTableDef(
                        type.type.value,
                        prop.name,
                    );
                }
            }
        }
    }
}

let output_dir: string[] = [];
let html_dir: string[] = [];

export async function generateSLuaMarkdown(
    lsl: LSLDef,
    outputDir: string,
    htmlDir: string,
): Promise<void> {
    const slua = await buildSluaJson(lsl);

    prepSlua(slua);

    output_dir = [outputDir, "slua"];
    html_dir = [htmlDir, "slua"];

    await ensureDir(path.join(...output_dir));
    await ensureDir(path.join(...html_dir));

    await generateTableProps([], slua.global);

    await generateTableProps([], {
        def: "table",
        name: "slua",
        props: { ...slua.classes },
    });
    await generateTable([], slua.global, "index.md", "index", {
        ...slua.classes,
    }, true);

    const index = await Deno.readTextFile(
        path.join("docs", "custom", "index.md"),
    );
    await Deno.writeTextFile(
        path.join(htmlDir, "index.html"),
        markdown("SLua Type Defs", index, {
            corners: "https://github.com/WolfGangS/sl_lua_types",
        }),
    );
    const readme = await Deno.readTextFile(
        path.join("README.md"),
    );
    await Deno.writeTextFile(
        path.join(htmlDir, "readme.html"),
        markdown(
            "SLua Type Defs",
            readme.replaceAll("docs/html/images", "images"),
            {
                corners: "https://github.com/WolfGangS/sl_lua_types",
            },
        ),
    );
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

async function ejsRenderFile(
    path: string,
    data: { [k: string]: any },
    options: { [k: string]: any },
) {
    return await ejs.renderFile(
        path,
        data,
        {
            escape: (e) => {
                return e;
            },
        },
    );
}

async function generateTableProps(section: string[], table: SLuaGlobalTable) {
    for (const sub in table.props) {
        await generateGlobal(
            [...section],
            table.props[sub],
        );
    }
}

async function generateGlobal(
    section: string[],
    global: SLuaDef | SLuaGlobalTable,
) {
    switch (global.def) {
        case "table":
            await generateTable([...section], global);
            await generateTableProps([...section, global.name], global);
            break;
        case "class":
            await generateClass([...section], global);
            await generateTableProps([...section, global.name], {
                def: "table",
                name: global.name,
                props: global.props,
            });
            await generateTableProps([...section, global.name], {
                def: "table",
                name: global.name,
                props: global.funcs,
            });
            break;
        case "func":
            await generateFunction(
                [...section],
                global,
            );
            break;
    }
}

async function generateClass(section: string[], cls: SLuaClassDef) {
    const name = [...section, cls.name].join(".");

    const fileName = `${name}`;

    const data = {
        cls,
        externalLinks: {},
        custom: await getCustomMarkdown("classes", fileName),
        funcs: Object.values(cls.funcs).sort(sortNameAlpha),
        props: Object.values(cls.props),
        tables: [],
        classes: [],
        section: {
            name: section.join("."),
            url: `../${section.join(".")}.html`,
        },
    };

    const out = await ejsRenderFile(
        path.join(templatePath, "class.md"),
        data,
        {},
    );

    await output(
        name,
        ["classes", fileName],
        out,
    );
}

async function generateFunction(
    section: string[],
    func: SLuaFuncDef,
) {
    const name = [...section, func.name].join(".");

    const fileName = `${name}`;

    const [sample, _sig] = generatePreferedCodeSample(section, func);

    const externalLinks: StrObj<string> = {};

    if (func.link) {
        if (func.link.toLowerCase().includes(".secondlife.com")) {
            externalLinks["Official URL"] = func.link;
        } else {
            externalLinks[func.link] = func.link;
        }
    }

    const data = {
        func,
        definitions: generateStringDefinitions(func),
        example: sample,
        alternatives: "",
        externalLinks,
        custom: await getCustomMarkdown("functions", fileName),
        section: {
            name: section.join("."),
            url: `../${section.join(".")}.html`,
        },
    };

    const out = await ejsRenderFile(
        path.join(templatePath, "function.md"),
        data,
        {},
    );

    await output(
        name,
        ["functions", fileName],
        out,
    );
}

async function generateTable(
    section: string[],
    table: SLuaGlobalTable | SLuaGlobal,
    template: string | null = null,
    fileName: string | null = null,
    extra: SLuaGlobalTableProps = {},
    valueSort: boolean = false,
) {
    const name = [...section, table.name];

    fileName = fileName ?? `${name.join(".")}`;

    let props: RenderPropTable = Object.values(
        table.props,
    ).filter((p) => p.def == "const").filter((p) => p.type.def == "simple")
        .sort(
            sortNameAlpha,
        );
    if (props.length > 50) {
        props = tableProps(props);
        const e = props["#"];
        delete props["#"];
        props = { "Misc": e, ...props };
    }

    const allFuncs: SLuaFuncDef[] = Object.values(table.props).filter((p) =>
        p.def == "func"
    ).sort(
        sortNameAlpha,
    );

    const funcs = allFuncs.filter((f) => !f.takesSelf);
    const selfFuncs = allFuncs.filter((f) => f.takesSelf);

    const data = {
        table: table,
        custom: await getCustomMarkdown([], fileName),
        funcs,
        selfFuncs,
        props,
        tables: Object.values(table.props).filter((p) => p.def == "table").sort(
            sortNameAlpha,
        ),
        classes: Object.values(extra).filter((e) => e.def == "class").sort(
            sortNameAlpha,
        ),
        section: {
            name: section.join("."),
            url: `${section.join(".")}.html`,
        },
    };
    const out = await ejsRenderFile(
        path.join(templatePath, template ?? "table.md"),
        data,
        {},
    );
    output(name.join("."), [fileName], out);
}

interface Named {
    name: string;
}

function sortNameAlpha(a: Named, b: Named): number {
    const ta = a.name.toUpperCase();
    const tb = b.name.toUpperCase();
    return (ta < tb) ? -1 : (ta > tb) ? 1 : 0;
}

type RenderPropTable = SLuaConstDef[] | { [k: string]: RenderPropTable };

function tableProps(
    props: SLuaConstDef[],
    splt: number = 1,
): RenderPropTable {
    const tblProps: { [k: string]: RenderPropTable } = {};
    for (const prop of props) {
        const parts = prop.name.split("_");
        let start = "#";
        if (parts.length > splt) {
            start = parts.slice(0, splt).join("_");
        }
        if (!tblProps[start]) tblProps[start] = [];
        tblProps[start].push(prop);
    }

    let misc: SLuaConstDef[] = [];
    for (const start in tblProps) {
        tblProps[start].sort(
            (a: SLuaConstDef, b: SLuaConstDef) => {
                return (a.value < b.value) ? -1 : (a.value > b.value) ? 1 : 0;
            },
        );
        if (tblProps[start].length < 3) {
            misc = [...misc, ...tblProps[start]];
            delete tblProps[start];
        } else if (splt < 2 && start != "#") {
            tblProps[start] = tableProps(tblProps[start], 2);
        }
    }
    if (misc.length > 0) {
        misc = [...misc, ...(tblProps["#"] ?? [])];
        misc.sort(sortNameAlpha);
        tblProps["#"] = misc;
    }
    const ks = Object.keys(tblProps);
    if (ks.length == 1) {
        return { "#": tblProps[ks[0]] };
    }
    return tblProps;
}
