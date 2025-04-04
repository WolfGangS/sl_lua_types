import { stringify } from "jsr:@std/toml";
import { buildSluaJson } from "./slua-json-gen.ts";

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

    unused_variable: {
      ignore_pattern: string;
    };
  };
};

export async function buildSluaSeleneConfig(
  file: string,
  strict: boolean = true,
): Promise<string> {
  const data = await buildSluaJson(file, strict);

  const eventNames = Object.entries(data.global.props)
    .filter(([_, prop]) => prop.def === "event")
    .map(([name]) => name);

  const ignorePattern = eventNames.map((name) => `^${name}$`).join("|");

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
      unused_variable: {
        ignore_pattern: ignorePattern,
      },
    },
  };

  return stringify(seleneConfig);
}
