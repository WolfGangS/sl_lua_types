### Example

Integers can only be compared to other integers, comparing to another type like
a `number` will always result in false

```lua
integer(6) == integer(6) -- true
integer(6) == integer(2) -- false
integer(6) == 6          -- false
integer(6) == 2          -- false
```
