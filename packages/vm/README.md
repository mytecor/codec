# @mytecor/codec-vm

Compiler and bytecode VM for codecs built with `@mytecor/codec-core`.

## Includes

- `Compiler`
- VM instruction types
- `executeRead(...)`
- `executeWrite(...)`

## Usage

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

## How It Works

The compiler consumes schema metadata published by `sequence(...)` and `branch(...)` from `@mytecor/codec-core`.

There are two execution modes in the overall system:

- direct: the codec reads and writes values itself
- compiled: `Compiler` turns schema nodes into an instruction program executed by the VM

If a codec does not expose schema metadata, compilation safely falls back to direct `codec.read(...)` and `codec.write(...)` calls for that leaf.
