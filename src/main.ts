import { buildLSLJson } from "./lsl/lsl-json-gen.ts";
import { buildSluaTypeDefs } from "./slua/slua-defs-gen.ts";
import { buildSluaDocs } from "./slua/slua-docs-gen.ts";
import { buildSluaJson } from "./slua/slua-json-gen.ts";
import { generateSLuaMarkdown } from "./slua/slua-md-gen.ts";
import { buildSluaSelene } from "./slua/slua-sele-gen.ts";
import { buildSluaSeleneConfig } from "./slua/slua-sele-conf-gen.ts";
import { buildSluaVSCodeSnippets } from "./slua/slua-vsc-snippets-gen.ts";

const keywordsFile = Deno.args[0];
const output = Deno.args[1];

// const map = await readKeywordsXML(keywordsFile);
// const output_type = Deno.args[1] ?? "defs";

switch (output) {
  case "lsl-json":
    console.log(JSON.stringify(await buildLSLJson(keywordsFile), null, 2));
    break;
  case "slua-json":
    console.log(JSON.stringify(await buildSluaJson(keywordsFile), null, 2));
    break;
  case "slua-defs":
    console.log(await buildSluaTypeDefs(keywordsFile));
    break;
  case "slua-docs":
    console.log(JSON.stringify(await buildSluaDocs(keywordsFile), null, 2));
    break;
  case "slua-vsc-snippets":
    console.log(await buildSluaVSCodeSnippets(keywordsFile));
    break;
  case "slua-sele":
    console.log(await buildSluaSelene(keywordsFile));
    break;
  case "slua-sele-config":
    console.log(await buildSluaSeleneConfig(keywordsFile));
    break;
  case "slua-markdown":
    await generateSLuaMarkdown(keywordsFile, Deno.args[2], Deno.args[3]);
    break;
    // case "slua-defs":
    //   buildDefs(map);
    //   break;
    // case "slua-docs":
    //   buildDocs(map);
    //   break;
    // case "slua-selene":
    // case "sele":
    //   buildSelene(map);
    //   break;
}
