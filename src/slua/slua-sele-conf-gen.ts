import { stringify } from "@std/toml";
import { LSLDef } from "../xml/xml-lsl-json-gen.ts";
// import { buildSluaJson } from "./slua-json-gen.ts";

type SeleneConfig = {
    std: string;

    rules: {
        global_usage: string;
        shadowing: string;
        must_use: string;
    };

    config: {
        empty_if: {
            comments_count: boolean;
        };

        unused_variable?: {
            ignore_pattern: string;
        };
    };
};

// deno-lint-ignore require-await
export async function buildSluaSeleneConfig(
    _lsl: LSLDef,
    _strict: boolean = true,
): Promise<string> {
    const seleneConfig: SeleneConfig = {
        std: "sl_selene_defs",
        rules: {
            global_usage: "allow",
            shadowing: "allow",
            must_use: "warn",
        },
        config: {
            empty_if: {
                comments_count: true,
            },
            // unused_variable: {
            //   ignore_pattern: ignorePattern,
            // },
        },
    };

    return stringify(seleneConfig);
}
