import { Codec, CodecNode, codecId, codecNode } from './codec.js'
import { Reader } from './reader.js'
import {
	executeRead,
	executeWrite,
	ReadInstruction,
	ReadProgram,
	WriteInstruction,
	WriteProgram,
} from './vm.js'
import { Writer } from './writer.js'

type CompileTask =
	| {
			type: 'visit'
			codec: Codec<unknown>
			node: CodecNode | undefined
	  }
	| {
			type: 'object_field_before'
			key: string
	  }
	| {
			type: 'object_field_after'
			key: string
	  }
	| {
			type: 'vector_finish'
			readStart: number
			readBody: number
			writeStart: number
			writeBody: number
	  }
	| {
			type: 'union_variant'
			readDispatchIndex: number
			writeDispatchIndex: number
			taggedCodec: Codec<unknown> & { [codecId]: number }
			readJumps: number[]
			writeJumps: number[]
	  }
	| {
			type: 'union_variant_end'
			readJumps: number[]
			writeJumps: number[]
	  }
	| {
			type: 'union_finish'
			readJumps: number[]
			writeJumps: number[]
	  }
	| {
			type: 'tag'
			id: number
	  }

const compileNode = (
	codec: Codec<unknown>,
	node: CodecNode | undefined,
	readProgram: ReadProgram = [],
	writeProgram: WriteProgram = [],
): { readProgram: ReadProgram; writeProgram: WriteProgram } => {
	const tasks: CompileTask[] = [{ type: 'visit', codec, node }]

	while (tasks.length > 0) {
		const task = tasks.pop() as CompileTask

		switch (task.type) {
			case 'visit': {
				if (task.node === undefined) {
					readProgram.push({ opcode: 'call', codec: task.codec })
					writeProgram.push({ opcode: 'call', codec: task.codec })
					break
				}

				switch (task.node.kind) {
					case 'object': {
						readProgram.push({ opcode: 'object_new' })

						const keys = Object.keys(task.node.shape)
						for (let index = keys.length - 1; index >= 0; index -= 1) {
							const key = keys[index]
							const childCodec = task.node.shape[key]
							tasks.push({ type: 'object_field_after', key })
							tasks.push({
								type: 'visit',
								codec: childCodec,
								node: childCodec[codecNode],
							})
							tasks.push({ type: 'object_field_before', key })
						}
						break
					}

					case 'vector': {
						const readStart = readProgram.length
						readProgram.push({
							opcode: 'vector_start',
							bare: task.node.bare,
							body: -1,
							exit: -1,
						})
						const writeStart = writeProgram.length
						writeProgram.push({
							opcode: 'vector_start',
							bare: task.node.bare,
							body: -1,
							exit: -1,
						})
						const readBody = readProgram.length
						const writeBody = writeProgram.length
						tasks.push({
							type: 'vector_finish',
							readStart,
							readBody,
							writeStart,
							writeBody,
						})
						tasks.push({
							type: 'visit',
							codec: task.node.item,
							node: task.node.item[codecNode],
						})
						break
					}

					case 'union': {
						const readDispatchIndex = readProgram.length
						readProgram.push({ opcode: 'union_dispatch', variants: new Map() })
						const writeDispatchIndex = writeProgram.length
						writeProgram.push({ opcode: 'union_dispatch', variants: new Map() })
						const readJumps: number[] = []
						const writeJumps: number[] = []
						tasks.push({ type: 'union_finish', readJumps, writeJumps })

						for (
							let index = task.node.codecs.length - 1;
							index >= 0;
							index -= 1
						) {
							tasks.push({
								type: 'union_variant',
								readDispatchIndex,
								writeDispatchIndex,
								taggedCodec: task.node.codecs[index],
								readJumps,
								writeJumps,
							})
						}
						break
					}

					case 'tagged':
						tasks.push({ type: 'tag', id: task.node.id })
						tasks.push({
							type: 'visit',
							codec: task.node.codec,
							node: task.node.codec[codecNode],
						})
						break
				}

				break
			}

			case 'object_field_before':
				writeProgram.push({ opcode: 'push_field', key: task.key })
				break

			case 'object_field_after':
				readProgram.push({ opcode: 'object_set', key: task.key })
				writeProgram.push({ opcode: 'pop_value' })
				break

			case 'vector_finish': {
				const readVectorStart = readProgram[task.readStart] as Extract<
					ReadInstruction,
					{ opcode: 'vector_start' }
				>
				readVectorStart.body = task.readBody
				readProgram.push({ opcode: 'vector_next', body: task.readBody })
				readVectorStart.exit = readProgram.length

				const writeVectorStart = writeProgram[task.writeStart] as Extract<
					WriteInstruction,
					{ opcode: 'vector_start' }
				>
				writeVectorStart.body = task.writeBody
				writeProgram.push({ opcode: 'vector_next', body: task.writeBody })
				writeVectorStart.exit = writeProgram.length
				break
			}

			case 'union_variant': {
				const readDispatch = readProgram[task.readDispatchIndex] as Extract<
					ReadInstruction,
					{ opcode: 'union_dispatch' }
				>
				readDispatch.variants.set(task.taggedCodec[codecId], readProgram.length)

				const writeDispatch = writeProgram[task.writeDispatchIndex] as Extract<
					WriteInstruction,
					{ opcode: 'union_dispatch' }
				>
				writeDispatch.variants.set(
					task.taggedCodec[codecId],
					writeProgram.length,
				)

				tasks.push({
					type: 'union_variant_end',
					readJumps: task.readJumps,
					writeJumps: task.writeJumps,
				})
				tasks.push({
					type: 'visit',
					codec: task.taggedCodec,
					node: task.taggedCodec[codecNode],
				})
				break
			}

			case 'union_variant_end': {
				const readJumpIndex = readProgram.length
				readProgram.push({ opcode: 'jump', target: -1 })
				task.readJumps.push(readJumpIndex)

				const writeJumpIndex = writeProgram.length
				writeProgram.push({ opcode: 'jump', target: -1 })
				task.writeJumps.push(writeJumpIndex)
				break
			}

			case 'union_finish': {
				const readEnd = readProgram.length
				const writeEnd = writeProgram.length

				for (const jumpIndex of task.readJumps) {
					const jump = readProgram[jumpIndex] as Extract<
						ReadInstruction,
						{ opcode: 'jump' }
					>
					jump.target = readEnd
				}

				for (const jumpIndex of task.writeJumps) {
					const jump = writeProgram[jumpIndex] as Extract<
						WriteInstruction,
						{ opcode: 'jump' }
					>
					jump.target = writeEnd
				}
				break
			}

			case 'tag':
				readProgram.push({ opcode: 'tag', id: task.id })
				break
		}
	}

	return { readProgram, writeProgram }
}

export class Compiler<T> {
	schema: Codec<T>
	private readonly readProgram: ReadProgram
	private readonly writeProgram: WriteProgram

	constructor(schema: Codec<T>) {
		this.schema = schema
		const programs = compileNode(schema as Codec<unknown>, schema[codecNode])
		this.readProgram = programs.readProgram
		this.writeProgram = programs.writeProgram
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
