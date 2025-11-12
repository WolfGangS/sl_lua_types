import { parse } from "@std/yaml";
import { LSLDef } from "../xml/xml-lsl-json-gen.ts";
import {
    ConstDef,
    EventDef,
    FuncArg,
    FuncArgs,
    FuncDef,
    TypeDefs,
} from "../types.d.ts";
import { ucFirst } from "../util.ts";
import { castValueType, cleanTooltip, hasEffect } from "../lsl/lslCommon.ts";

type YAMLConst = {
    tooltip: string;
    type: string;
    value: string;
    deprecated?: boolean;
    private?: boolean;
};

type YAMLEvent = {
    tooltip: string;
    arguments: YAMLFuncArg[];
    deprecated?: boolean;
};

type YAMLFunc = {
    arguments: YAMLFuncArg[];
    energy: number;
    "func-id": number;
    return: string;
    sleep: number;
    tooltip: string;

    native?: boolean;
    pure?: boolean;
    "bool-semantics"?: boolean;
    experience?: boolean;
    deprecated?: boolean;
    private?: boolean;
    "god-mode"?: boolean;
    "index-semantics"?: boolean;
    "linden-experience"?: boolean;
    "mono-sleep"?: number;
};

type YAMLFuncArg = {
    [k: string]: {
        tooltip: string;
        type: string;
    };
};

type YAMLDef = {
    "llsd-lsl-syntax-version": number;
    constants: { [k: string]: YAMLConst };
    events: { [k: string]: YAMLEvent };
    functions: { [k: string]: YAMLFunc };
};

export async function buildLSLJsonFromYML(file: string): Promise<LSLDef> {
    const text = await Deno.readTextFile(file);

    const yaml: YAMLDef = parse(text) as YAMLDef;

    const def: LSLDef = {
        functions: {},
        constants: {},
        events: {},
        types: getTypes(),
    };

    for (const funcName in yaml.functions) {
        const yFunc = yaml.functions[funcName];
        const priv = yFunc.private || false;
        const func: FuncDef = {
            def: "func",
            name: funcName,
            args: buildYMLArgs(yFunc.arguments),
            result: yFunc.return,
            desc: cleanTooltip(yFunc.tooltip),
            energy: yFunc.energy,
            sleep: yFunc.sleep,
            must_use: !hasEffect(funcName),
            link: priv
                ? ""
                : "https://wiki.secondlife.com/wiki/" + ucFirst(funcName),
            private: priv,
            //pure: yFunc.pure || false,
        };
        if (yFunc["god-mode"]) func["god-mode"] = true;
        if (yFunc["linden-experience"]) func["linden-experience"] = true;
        def.functions[funcName] = func;
    }

    for (const conName in yaml.constants) {
        const yCon = yaml.constants[conName];
        const con: ConstDef = {
            def: "const",
            name: conName,
            valueRaw: yCon.value.toString(),
            value: castValueType(yCon.value, yCon.type),
            type: yCon.type,
            desc: cleanTooltip(yCon.tooltip),
            link: "https://wiki.secondlife.com/wiki/" + conName,
            // deprecated: yCon.deprecated || false,
            // private: yCon.private || false,
        };
        def.constants[conName] = con;
    }

    for (const eventName in yaml.events) {
        const yEvent = yaml.events[eventName];
        const event: EventDef = {
            def: "event",
            name: eventName,
            args: buildYMLArgs(yEvent.arguments),
            desc: cleanTooltip(yEvent.tooltip),
            link: "https://wiki.secondlife.com/wiki/" + ucFirst(eventName),
        };
        def.events[eventName] = event;
    }
    return def;
}

function buildYMLArgs(yArgs: YAMLFuncArg[]): FuncArgs {
    const args: FuncArgs = [];

    for (const i in yArgs) {
        const yArg = yArgs[i];
        const [name, argData] = Object.entries(yArg)[0];
        const arg: FuncArg = {
            def: "arg",
            name,
            desc: cleanTooltip(argData.tooltip),
            type: argData.type,
        };
        args.push(arg);
    }

    return args;
}

function getTypes(): TypeDefs {
    return {
        "float": {
            "name": "float",
            "desc":
                "32 bit floating point value.\nThe range is 1.175494351E-38 to 3.402823466E+38.",
        },
        "integer": {
            "name": "integer",
            "desc":
                "32 bit integer value.\n−2,147,483,648 and +2,147,483,647 (that is 0x80000000 to 0x7FFFFFFF in hex).",
        },
        "key": {
            "name": "key",
            "desc":
                'A 128 bit unique identifier (UUID).\nThe key is represented as hexidecimal characters (A-F and 0-9), grouped into sections (8,4,4,4,12 characters) and separated by hyphens (for a total of 36 characters). e.g. "A822FF2B-FF02-461D-B45D-DCD10A2DE0C2".',
        },
        "list": {
            "name": "list",
            "desc":
                'A collection of other data types.\nLists are signified by square brackets surrounding their elements; the elements inside are separated by commas. e.g. [0, 1, 2, 3, 4] or ["Yes", "No", "Perhaps"].',
        },
        "quaternion": {
            "name": "quaternion",
            "desc":
                "The quaternion type is a left over from way back when LSL was created. It was later renamed to <rotation> to make it more user friendly, but it appears someone forgot to remove it ;-)",
        },
        "rotation": {
            "name": "rotation",
            "desc":
                "The rotation type is one of several ways to represent an orientation in 3D.\nIt is a mathematical object called a quaternion. You can think of a quaternion as four numbers (x, y, z, w), three of which represent the direction an object is facing and a fourth that represents the object's banking left or right around that direction.",
        },
        "string": {
            "name": "string",
            "desc": "Text data.\nThe editor accepts UTF-8 encoded text.",
        },
        "vector": {
            "name": "vector",
            "desc":
                "A vector is a data type that contains a set of three float values.\nVectors are used to represent colors (RGB), positions, and directions/velocities.",
        },
    };
}
