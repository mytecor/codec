import { Compiler } from '../src/compiler.js'
import { bool } from '../src/mtproto/bool.js'
import { bytes } from '../src/mtproto/bytes.js'
import { double } from '../src/mtproto/double.js'
import { id } from '../src/mtproto/id.js'
import { int32 } from '../src/mtproto/int32.js'
import { int53 } from '../src/mtproto/int53.js'
import { int128 } from '../src/mtproto/int128.js'
import { int256 } from '../src/mtproto/int256.js'
import { long } from '../src/mtproto/long.js'
import { nullable } from '../src/mtproto/null.js'
import { object } from '../src/mtproto/object.js'
import { string } from '../src/mtproto/string.js'
import { uint32 } from '../src/mtproto/uint32.js'
import { union } from '../src/mtproto/union.js'
import { vector } from '../src/mtproto/vector.js'

const NestedSchema = object({
	test: string(),
})

const PrimitivesSchema = object({
	flag: bool(),
	count: int32(),
	size: uint32(),
	ratio: double(),
	bigCount: int53(),
	messageId: long(),
	payload: bytes(),
	tags: vector(string()),
	optional: nullable(),
	fingerprint128: int128(),
	fingerprint256: int256(),
})

const ExampleSchema = id(
	object({
		testKey: string(),
		test: bytes(),

		nested: NestedSchema,
	}),
	1,
)

const Example2Schema = id(
	object({
		test: string(),
	}),
	2,
)

export const AnnounceSchema = union([ExampleSchema, Example2Schema])

const ann = new Compiler(AnnounceSchema)
const primitives = new Compiler(PrimitivesSchema)

const res = ann.write(
	ExampleSchema({
		testKey: 'hello',
		test: Uint8Array.of(1, 2, 3, 4),
		nested: {
			test: 'world',
		},
	}),
)

const result = ann.read(res)

const primitiveRes = primitives.write({
	flag: true,
	count: -10,
	size: 42,
	ratio: Math.PI,
	bigCount: 2 ** 40,
	messageId: 1234567890123456789n,
	payload: Uint8Array.of(10, 20, 30, 40),
	tags: ['one', 'two', 'three'],
	optional: null,
	fingerprint128: new Uint8Array(16).fill(1),
	fingerprint256: new Uint8Array(32).fill(2),
})

const primitiveResult = primitives.read(primitiveRes)

console.log('union', result)
console.log('primitives', primitiveResult)
