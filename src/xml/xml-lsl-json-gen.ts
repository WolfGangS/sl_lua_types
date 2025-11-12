import { isMap, Map, Node } from "./types.ts";
import { readKeywordsXML } from "./readKeywordXML.ts";
import {
    ConstDefs,
    EventDefs,
    FuncArgs,
    FuncDefs,
    Overrides,
    TypeDefs,
} from "../types.d.ts";
import { applyPatches, isStrObj as _isStrObj } from "../util.ts";
import _overrides from "../../data/lsl_keywords.overrides.json" with {
    type: "json",
};
import { castValueType, cleanTooltip, hasEffect } from "../lsl/lslCommon.ts";

const overides = _overrides as Overrides;
export type LSLDef = {
    functions: FuncDefs;
    constants: ConstDefs;
    events: EventDefs;
    types: TypeDefs;
};

export async function buildLSLJsonFromXML(file: string): Promise<LSLDef> {
    const map = await readKeywordsXML(file);
    const lsl = {
        functions: generateFunctions(map.get("functions") as Map),
        constants: generateConstants(map.get("constants") as Map),
        events: generateEvents(map.get("events") as Map),
        types: generateTypes(map.get("types") as Map),
    };

    applyPatches(lsl, overides);

    return lsl;
}

function generateFunctions(funcs: Map): FuncDefs {
    const out: FuncDefs = {};

    for (const entry of funcs.content) {
        const [name, map] = entry;
        if (!isMap(map)) continue;

        out[name] = {
            def: "func",
            name,
            args: generateFuncArguments(map.get("arguments")),
            result: map.get("return")?.text ?? "void",
            desc: cleanTooltip(map.get("tooltip")?.text ?? ""),
            energy: parseInt(map.get("energy")?.text ?? "10"),
            sleep: parseInt(map.get("sleep")?.text ?? "0"),
            must_use: !hasEffect(name),
            link: `https://wiki.secondlife.com/wiki/${
                name.substring(0, 1).toUpperCase()
            }${name.substring(1)}`,
            private: false,
            //pure: false,
        };
    }

    return out;
}

function generateFuncArguments(args: Node | null): FuncArgs {
    const out: FuncArgs = [];
    if (args && args.type == "array") {
        for (const argMap of args.children) {
            if (!isMap(argMap)) continue;
            if (argMap.content.length > 1) {
                console.warn(argMap.toString(), "LONG");
                continue;
            }
            for (const arg of argMap.content) {
                const [name, map] = arg;
                if (!isMap(map)) continue;
                out.push(
                    {
                        def: "arg",
                        name,
                        desc: map.get("tooltip")?.text ?? "",
                        type: map.get("type")?.text ?? "n/a",
                    },
                );
            }
        }
    }
    return out;
}

function generateConstants(consts: Map): ConstDefs {
    const out: ConstDefs = {};
    for (const entry of consts.content) {
        const [name, map] = entry;
        if (!isMap(map)) continue;
        if (name == "default") continue;

        const valueRaw = map.get("value")?.text ?? "";
        const type = map.get("type")?.text ?? "void";
        const value = castValueType(valueRaw, type);

        out[name] = {
            def: "const",
            name,
            valueRaw,
            value,
            type: type,
            desc: cleanTooltip(map.get("tooltip")?.text ?? ""),
            link: `https://wiki.secondlife.com/wiki/${name}`,
        };
    }
    return out;
}

function generateEvents(events: Map): EventDefs {
    const out: EventDefs = {};

    for (const entry of events.content) {
        const [name, map] = entry;
        if (!isMap(map)) continue;

        out[name] = {
            def: "event",
            name,
            args: generateFuncArguments(map.get("arguments")),
            desc: cleanTooltip(map.get("tooltip")?.text ?? ""),
            link: `https://wiki.secondlife.com/wiki/${
                name.substring(0, 1).toUpperCase()
            }${name.substring(1)}`,
        };
    }

    return out;
}

function generateTypes(types: Map): TypeDefs {
    const out: TypeDefs = {};
    for (const entry of types.content) {
        const [name, map] = entry;
        if (!isMap(map)) continue;

        out[name] = {
            name,
            desc: cleanTooltip(map.get("tooltip")?.text ?? ""),
        };
    }
    return out;
}
