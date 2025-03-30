import { buildLSLJson } from "./lsl/lsl-json-gen.ts";
import { buildSluaTypeDefs } from "./slua/slua-defs-gen.ts";
import { buildSluaDocs } from "./slua/slua-docs-gen.ts";
import { buildSluaJson } from "./slua/slua-json-gen.ts";
import { buildSluaSelene } from "./slua/slua-sele-gen.ts";

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
  case "slua-sele":
    console.log(await buildSluaSelene(keywordsFile));
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
