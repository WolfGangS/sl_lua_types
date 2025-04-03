### Example

#### WARNING - Errors

Integers can only be compared to other integers, comparing to another type like
a `number` will cause an `error`

```lua
integer(6) <= integer(9) -- true
integer(6) <= integer(6) -- true
integer(6) <= integer(2) -- false

integer(6) <= 6          -- ERROR
integer(6) <= 2          -- ERROR


-- __le is also responsible for >= comparisons (as it's the same operation with the sides flipped)
integer(6) >= integer(2) -- true
integer(6) >= integer(6) -- true
```
