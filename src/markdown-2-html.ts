import { create, formatConfig, Options } from "npm:markdown-to-html-cli";
import * as path from "jsr:@std/path";

type Markdown2HTMLConfig = {
  description?: string;
  favicon?: string;
  darkMode?: boolean | "auto";
  corners?: string;
  markdownStyle?: string;
  markdownStyleTheme?: string;
  style?: string[];
};

const collapseCSS = await Deno.readTextFile(
  path.join(import.meta.dirname, "..", "resources", "docs.css"),
);

export function generate(
  title: string,
  markdown: string,
  conf: Markdown2HTMLConfig,
) {
  const description = conf.description || "";
  const favicon = conf.favicon || "";
  //const config = getInput("config");
  const corners = conf.corners || "";
  const darkMode = conf.darkMode || true;
  const markdownStyle = conf.markdownStyle || "";
  //   const style = conf.style || "";
  const markdownStyleTheme = conf.markdownStyleTheme || "";
  const options: Options = {
    document: { meta: [], link: [], style: conf.style ?? [collapseCSS] },
    title,
  };

  options.markdown = markdown;
  options.favicon = favicon;
  //   options.config = config;
  options.description = description;
  options["github-corners"] = corners;
  options["markdown-style"] = markdownStyle;

  options["dark-mode"] = darkMode;
  options["markdown-style-theme"] = markdownStyleTheme;

  const opts = formatConfig({
    ...options,
  });
  opts.document.title = title;

  return create({ ...opts });
}
