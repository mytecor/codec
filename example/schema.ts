import { buffer } from '../src/codecs/buffer.js'
import { id } from '../src/codecs/id.js'
import { object } from '../src/codecs/object.js'
import { string } from '../src/codecs/string.js'
import { union } from '../src/codecs/union.js'
import { Compiler } from '../src/compiler.js'

const NestedSchema = object({
	test: string(),
})

const ExampleSchema = id(
	object({
		testKey: string(),
		test: buffer(),

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

const res = ann.write(
	ExampleSchema({
		testKey: '',
		test: new Uint8Array().buffer,
		nested: {
			test: '',
		},
	}),
)

const result = ann.read(res)
console.log(result)
