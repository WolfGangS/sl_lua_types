#### WARNING - Errors

`lljson.decode` will error if an invalid string is passed to it.

It is recommended to use
[`pcall`](https://luau.org/library#:~:text=function%20pcall%28) or
[`xpcall`](https://luau.org/library#:~:text=function%20xpcall%28) to wrap the
method and handle the resulting error

### Example

#### With `pcall`

```lua
local valid_json = '["first","second","third"]'
local ok, result = pcall(lljson.decode, valid_json)
if ok then
    ll.OwnerSay(`The json was valid. '{result[1]}' '{result[3]}'`)  -- prints: The json was valid. 'first' 'third'
else
    ll.OwnerSay("The json was invalid")                             -- will not be called
end
```

```lua
local invalid_json = '"first","second","third"'
local ok, result = pcall(lljson.decode, invalid_json)
if ok then
    ll.OwnerSay(`The json was valid. '{result[1]}' '{result[3]}'`)  -- will not be called
else
    ll.OwnerSay("The json was invalid")                             -- prints: The json was invalid
end
```

#### Without `pcall`

```lua
local valid_json = '["first","second","third"]'
local result = lljson.decode(valid_json)
ll.OwnerSay(`The json was valid. '{result[1]}' '{result[3]}'`)  -- prints: The json was valid. 'first' 'third'
```

```lua
local invalid_json = '"first","second","third"'
local result = lljson.decode(invalid_json)               -- Script errors and dies
ll.OwnerSay(`The json was valid. '{result[1]}' '{result[3]}'`)  -- will not be called
```
