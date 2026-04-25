# Codec

A TypeScript workspace for binary serialization and deserialization built around declarative codecs.

The repository is split into three packages:

- [@mytecor/codec-core](./packages/core/README.md) - core codec types, schema nodes, `Reader`, and `Writer`
- [@mytecor/codec-mtproto](./packages/mtproto/README.md) - MTProto-oriented primitive and composite codecs
- [@mytecor/codec-vm](./packages/vm/README.md) - schema compiler and bytecode VM

## Quick Start

Typical usage combines `@mytecor/codec-mtproto` with `@mytecor/codec-vm`:

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
