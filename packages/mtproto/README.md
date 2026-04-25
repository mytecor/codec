# @mytecor/codec-mtproto

MTProto-oriented codecs built on top of `@mytecor/codec`.

## Includes

- primitives: `bool`, `int32`, `uint32`, `int53`, `long`, `float`, `double`
- binary values: `bytes`, `int128`, `int256`
- strings and nullable values: `string`, `nullable`
- composite codecs: `object`, `vector`, `id`, `union`

## Usage

```ts
import { object, string, uint32, vector } from '@mytecor/codec-mtproto'

const User = object({
	id: uint32(),
	name: string(),
	tags: vector(string(), true),
})
```

## Tagged Unions

Use `id(...)` to assign a constructor id and `union(...)` to combine variants:

```ts
import { codecId } from '@mytecor/codec'
import { id, object, string, uint32, union } from '@mytecor/codec-mtproto'

const User = id(
	object({
		id: uint32(),
		name: string(),
	}),
	0x10000001,
)

const Channel = id(
	object({
		id: uint32(),
		title: string(),
	}),
	0x10000002,
)

const Entity = union([User, Channel] as const)

console.log(User({ id: 1, name: 'alice' })[codecId])
```

`union(...)` reads and writes the variant identifier, while `id(...)` tags the value with the hidden `codecId` symbol.

## With The VM

For compiled execution, pair this package with `@mytecor/codec-vm`:

```ts
import { object, string, uint32 } from '@mytecor/codec-mtproto'
import { Compiler } from '@mytecor/codec-vm'

const User = object({
	id: uint32(),
	name: string(),
})

const compiler = new Compiler(User)
```

## Example

See `packages/mtproto/example/schema.ts` for a fuller schema example.
