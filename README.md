# Codec

A TypeScript library for binary serialization and deserialization based on declarative schemas.

This project can:

- describe binary structures with `Codec<T>`
- read and write data directly through `read` / `write`
- compile composite schemas into an internal program with `Compiler`
- work with MTProto-like primitives, objects, vectors, and tagged unions

## Features

- primitive codecs: `bool`, `int32`, `uint32`, `int53`, `long`, `float`, `double`
- binary and string types: `bytes`, `string`, `int128`, `int256`, `nullable`
- composite types: `object`, `vector`, `id`, `union`
- low-level schema building blocks: `sequence`, `branch`
- helper classes: `Reader` and `Writer`
- tests based on `node:test`

## Installation

```bash
pnpm install
```

## Commands

```bash
pnpm test
pnpm typecheck
```

You can run the repository example with:

```bash
node --import tsx example/schema.ts
```

## Quick Start

The repository is split into a `pnpm` workspace:

- `packages/codec` - core codec types and low-level reader/writer utilities
- `packages/codec-mtproto` - MTProto-oriented schema codecs
- `packages/codec-vm` - compiler and bytecode VM

Use the packages directly, for example:

```ts
import { object, string, uint32 } from '@mytecor/codec-mtproto'
import { Compiler } from '@mytecor/codec-vm'
```

Example object schema:

```ts
import { object, string, uint32 } from '@mytecor/codec-mtproto'
import { Compiler } from '@mytecor/codec-vm'

const User = object({
	id: uint32(),
	name: string(),
})

const compiler = new Compiler(User)

const buffer = compiler.write({
	id: 7,
	name: 'alice',
})

const decoded = compiler.read(buffer)

console.log(decoded)
```

## Tagged Union

For schemas with a discriminator field, use `id(...)` together with `union(...)`:

```ts
import { codecId } from '@mytecor/codec'
import { id, object, string, uint32, union } from '@mytecor/codec-mtproto'
import { Compiler } from '@mytecor/codec-vm'

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
const compiler = new Compiler(Entity)

const encoded = compiler.write(
	User({
		id: 1,
		name: 'alice',
	}),
)

const decoded = compiler.read(encoded)

console.log(decoded[codecId])
console.log(decoded)
```

`union(...)` writes and reads the variant identifier, while `id(...)` tags the value with the hidden `codecId` symbol.

## How It Works

The base interface for any schema is:

```ts
type Codec<T> = {
	read(reader: Reader): T
	write(writer: Writer, value: T): void
}
```

There are two execution modes:

- direct: the codec reads and writes data by itself
- compiled: `Compiler` turns a composite schema into an instruction program and executes it via the VM

If a codec exposes an internal schema node via `sequence(...)` or `branch(...)`, the compiler uses it to optimize traversal of composite structures. If no such node exists, the compiler safely falls back to regular `codec.read(...)` and `codec.write(...)` calls.

## Project Structure

- `packages/codec/src/*` - base types and low-level buffer primitives
- `packages/codec-mtproto/src/*` - ready-to-use MTProto codecs
- `packages/codec-vm/src/*` - schema compilation and VM execution
- `example/schema.ts` - usage example
- `packages/*/src/**/*.test.ts` - tests

## Development

Useful project checks:

```bash
pnpm test
pnpm typecheck
```

The `debug` package is used to inspect internal compiler and VM execution steps.

## License

MIT
