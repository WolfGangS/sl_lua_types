## Types for luau-lsp for lua in secondlife

See [here](https://wiki.secondlife.com/wiki/Luau_Alpha) and
[here](https://wiki.secondlife.com/wiki/Lua_FAQ) for more information about lua
in secondlife.

<img src="images/example.png" alt="Example of syntax highlighting and hovertips" />

Created with plenty of help and original findings from
[@gwigz](https://github.com/gwigz)

## VSCode installaion

1. Install vscode
2. Install
   [this](https://marketplace.visualstudio.com/items?itemName=JohnnyMorganz.luau-lsp)
   extension ([github link](https://github.com/JohnnyMorganz/luau-lsp))
3. Download a `sl_lua_types.zip` from
   [here](https://github.com/WolfGangS/sl_lua_types/releases/latest)
4. Extract and place those files somewhere memorable (`<user_dir>/.sl-luau/` for
   instance)
5. Then Either globaly or in your project add the 2 files to the options with
   the following config

   ```JSON
   "luau-lsp.types.definitionFiles": [
       "~/.sl-luau/ll.d.luau"
   ],
   "luau-lsp.types.documentationFiles": [
       "~/.sl-luau/ll.d.json"
   ],
   "luau-lsp.platform.type": "standard"
   ```

   or through the UI

6. You may need to restart vscode or reload the ui
