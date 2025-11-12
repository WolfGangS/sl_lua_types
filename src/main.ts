import { buildLSLJsonFromXML, LSLDef } from "./xml/xml-lsl-json-gen.ts";
import { buildSluaTypeDefs } from "./slua/slua-defs-gen.ts";
import { buildSluaDocs } from "./slua/slua-docs-gen.ts";
import { buildSluaJson } from "./slua/slua-json-gen.ts";
import { generateSLuaMarkdown } from "./slua/slua-md-gen.ts";
import { buildSluaSelene } from "./slua/slua-sele-gen.ts";
import { buildSluaSeleneConfig } from "./slua/slua-sele-conf-gen.ts";
import { buildSluaVSCodeSnippets } from "./slua/slua-vsc-snippets-gen.ts";
import { buildLSLJsonFromYML } from "./yaml/readLSLDefinitionsYAML.ts";

const keywordsFile = Deno.args[0];
const output = Deno.args[1];

// const map = await readKeywordsXML(keywordsFile);
// const output_type = Deno.args[1] ?? "defs";

const getLSLDef = async (fileName: string): Promise<LSLDef> => {
    switch (fileName.split(".").pop()?.toLowerCase()) {
        case "xml":
            return await buildLSLJsonFromXML(keywordsFile);
        case "yml":
        case "yaml":
            return await buildLSLJsonFromYML(keywordsFile);
        default:
            throw `Unsupported file format '${fileName}'`;
    }
};

const lslDef: LSLDef = await getLSLDef(keywordsFile);

switch (output) {
    case "lsl-json":
        console.log(
            JSON.stringify(lslDef, null, 2),
        );
        break;
    case "slua-json":
        console.log(
            JSON.stringify(
                await buildSluaJson(lslDef, { includPrivate: true }),
                null,
                2,
            ),
        );
        break;
    case "slua-defs":
        console.log(await buildSluaTypeDefs(lslDef));
        break;
    case "slua-docs":
        console.log(JSON.stringify(await buildSluaDocs(lslDef), null, 2));
        break;
    case "slua-vsc-snippets":
        console.log(await buildSluaVSCodeSnippets(lslDef));
        break;
    case "slua-sele":
        console.log(await buildSluaSelene(lslDef));
        break;
    case "slua-sele-config":
        console.log(await buildSluaSeleneConfig(lslDef));
        break;
    case "slua-markdown":
        await generateSLuaMarkdown(lslDef, Deno.args[2], Deno.args[3]);
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
