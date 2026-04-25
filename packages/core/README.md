# @mytecor/codec-core

Core primitives for building binary codecs.

This package contains the low-level pieces shared by the rest of the workspace:

- `Codec<T>`
- `sequence(...)`
- `branch(...)`
- `codecId`, `codecNode`, `codecInner`
- `Reader`
- `Writer`

## Usage

```ts
import { Codec, Reader, Writer, sequence } from '@mytecor/codec-core'

const byte = (): Codec<number> => ({
	read(reader) {
		return reader.raw(1)[0]
	},

	write(writer, value) {
		writer.raw(Uint8Array.of(value))
	},
})

const pair = sequence(
	{
		read(reader) {
			return {
				left: byte().read(reader),
				right: byte().read(reader),
			}
		},

		write(writer, value) {
			byte().write(writer, value.left)
			byte().write(writer, value.right)
		},
	},
	{
		create: () => ({ left: 0, right: 0 }),
		steps: [],
	},
)

const writer = new Writer()
pair.write(writer, { left: 1, right: 2 })

const buffer = writer.finish()
const decoded = pair.read(new Reader(buffer))

console.log(decoded)
```

## API

### `Codec<T>`

```ts
type Codec<T> = {
	read(reader: Reader): T
	write(writer: Writer, value: T): void
}
```

### `sequence(...)`

Declares a composite codec as a linear sequence of child codecs. This metadata is used by `@mytecor/codec-vm` for compilation.

### `branch(...)`

Declares a branch-based codec with a selector and keyed variants. This is used for tagged unions and other discriminated layouts.

### `Reader` and `Writer`

- `Reader` provides sequential binary reads over `ArrayBuffer` or typed-array input.
- `Writer` accumulates byte chunks and returns a final `ArrayBuffer`.
