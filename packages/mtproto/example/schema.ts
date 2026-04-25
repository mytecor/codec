import { Compiler } from '@mytecor/codec-vm'
import {
	bool,
	bytes,
	double,
	id,
	int32,
	int53,
	int128,
	int256,
	long,
	nullable,
	object,
	string,
	uint32,
	union,
	vector,
} from '../src/index.js'

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
