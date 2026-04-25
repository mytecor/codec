import { Codec, codecId, codecNode, CodecNode } from './codec.js'
import { Reader } from './reader.js'
import { Writer } from './writer.js'
import { executeRead, executeWrite, ReadProgram, WriteProgram } from './vm.js'

const compileReadNode = (
	codec: Codec<unknown>,
	node: CodecNode | undefined,
): ReadProgram => {
	if (node === undefined) {
		return [{ opcode: 'call', codec }]
	}

	switch (node.kind) {
		case 'object': {
			const program: ReadProgram = [{ opcode: 'object_start' }]

			for (const key of Object.keys(node.shape)) {
				program.push(
					...compileReadNode(node.shape[key], node.shape[key][codecNode]),
				)
				program.push({ opcode: 'object_set', key })
			}

			return program
		}

		case 'vector':
			return [
				{
					opcode: 'vector',
					bare: node.bare,
					item: compileReadNode(node.item, node.item[codecNode]),
				},
			]

		case 'union':
			return [
				{
					opcode: 'union',
					variants: new Map(
						node.codecs.map((taggedCodec) => [
							taggedCodec[codecId],
							compileReadNode(taggedCodec, taggedCodec[codecNode]),
						]),
					),
				},
			]

		case 'tagged':
			return [
				...compileReadNode(node.codec, node.codec[codecNode]),
				{ opcode: 'tag', id: node.id },
			]
	}
}

const compileWriteNode = (
	codec: Codec<unknown>,
	node: CodecNode | undefined,
): WriteProgram => {
	if (node === undefined) {
		return [{ opcode: 'call', codec }]
	}

	switch (node.kind) {
		case 'object':
			return Object.keys(node.shape).map((key) => ({
				opcode: 'field',
				key,
				program: compileWriteNode(node.shape[key], node.shape[key][codecNode]),
			}))

		case 'vector':
			return [
				{
					opcode: 'vector',
					bare: node.bare,
					item: compileWriteNode(node.item, node.item[codecNode]),
				},
			]

		case 'union':
			return [
				{
					opcode: 'union',
					variants: new Map(
						node.codecs.map((taggedCodec) => [
							taggedCodec[codecId],
							compileWriteNode(taggedCodec, taggedCodec[codecNode]),
						]),
					),
				},
			]

		case 'tagged':
			return compileWriteNode(node.codec, node.codec[codecNode])

		default:
			return [{ opcode: 'call', codec }]
	}
}

export class Compiler<T> {
	schema: Codec<T>
	private readonly readProgram: ReadProgram
	private readonly writeProgram: WriteProgram

	constructor(schema: Codec<T>) {
		this.schema = schema
		this.readProgram = compileReadNode(
			schema as Codec<unknown>,
			schema[codecNode],
		)
		this.writeProgram = compileWriteNode(
			schema as Codec<unknown>,
			schema[codecNode],
		)
	}

	read(buffer: ArrayBuffer) {
		const reader = new Reader(buffer)
		return executeRead(this.readProgram, reader) as T
	}

	write(value: T) {
		const writer = new Writer()
		executeWrite(this.writeProgram, writer, value)
		return writer.finish()
	}
}
