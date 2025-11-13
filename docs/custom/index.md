# Secondlife SLua Scripting Info

## [Generated SLua Documentation](slua/index.html)

A basic 'wiki like' layout documenting current SLua `functions`, `types`,
`classes`, and `constants`.

## [Secondlife SLua Type Defs](https://github.com/WolfGangS/sl_lua_types)

A set of files for adding type hinting and autocompletion along with error
checking to vscode and other editors that support the lsp protocol

<img src="images/example.png" alt="Example of syntax highlighting and hovertips" />

- [Type Definitions](dist/ll.d.luau)
- [Type Documentation](dist/ll.d.json)
- Selene [Standard Library](dist/sl_selene_defs.yml) and
  [Toml Config](dist/selene.toml)
- [Snippets](dist/slua.code-snippets)
- [Builtins](dist/builtins.txt) text file for use with luau-compile and
  [LSL-PyOptimizer](https://github.com/Sei-Lisa/LSL-PyOptimizer) scripts

With [Instructions](readme.html) on how to set them up

## [VSCode Secondlife External Editor Extension](https://github.com/WolfGangS/SL-External-Editor?tab=readme-ov-file)

An extension designed to make working with vscode as the external editor for
secondlife easier

### [Get it here](https://marketplace.visualstudio.com/items?itemName=wlf-io.sl-external-editor)

### Features

- Windows, Linux, Mac
- Automatic detection of sl viewers temporary script files when using external
  editor feature
- [Luau Language Server](https://marketplace.visualstudio.com/items?itemName=JohnnyMorganz.luau-lsp)
  (optional)
- [Selene](https://marketplace.visualstudio.com/items?itemName=Kampfkarren.selene-vscode)
  (optional)
- Any Second Life viewer that has the `ExternalEditor` feature
- Automatic type definition downloading for `SLua`

### Planned Features

- Preprocessor tool integration for `LSL` and `SLua`

## For Tooling Devs

I also publish the generated intermediary json for both `LSL` and `SLua`. These
may be of use to you as they contain extra information and are in a format
easier to parse in my opinion than the `keywords_llsd.xml` file Linden Labs
generates.

- [LSL Json](dist/lsl_keywords.json)
- [SLua Json](dist/slua_keywords.json)
