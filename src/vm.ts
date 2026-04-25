import { Codec, codecId } from './codec.js'
import { Reader } from './reader.js'
import { toBase16 } from './toBase16.js'
import { Writer } from './writer.js'

const VECTOR_ID = 0x1cb5c415

export type ReadInstruction =
	| { opcode: 'call'; codec: Codec<unknown> }
	| { opcode: 'object_new' }
	| { opcode: 'object_set'; key: string }
	| { opcode: 'vector_start'; bare: boolean; body: number; exit: number }
	| { opcode: 'vector_next'; body: number }
	| { opcode: 'union_dispatch'; variants: Map<number, number> }
	| { opcode: 'tag'; id: number }
	| { opcode: 'jump'; target: number }

export type WriteInstruction =
	| { opcode: 'call'; codec: Codec<unknown> }
	| { opcode: 'push_field'; key: string }
	| { opcode: 'pop_value' }
	| { opcode: 'vector_start'; bare: boolean; body: number; exit: number }
	| { opcode: 'vector_next'; body: number }
	| { opcode: 'union_dispatch'; variants: Map<number, number> }
	| { opcode: 'jump'; target: number }

export type ReadProgram = ReadInstruction[]
export type WriteProgram = WriteInstruction[]

type ReadVectorFrame = {
	remaining: number
	values: unknown[]
	exit: number
}

type WriteVectorFrame = {
	values: unknown[]
	index: number
	exit: number
}

const tagValue = <T>(value: T, id: number): T => {
	Object.defineProperty(value as object, codecId, {
		value: id,
		enumerable: false,
		configurable: false,
	})

	return value
}

const readUint32 = (reader: Reader): number => {
	const value = reader.view.getUint32(reader.offset, true)
	reader.seek(4)
	return value
}

const writeUint32 = (writer: Writer, value: number): void => {
	const bytes = new Uint8Array(4)
	const view = new DataView(bytes.buffer)
	view.setUint32(0, value, true)
	writer.raw(bytes)
}

export const executeRead = (program: ReadProgram, reader: Reader): unknown => {
	const valueStack: unknown[] = []
	const vectorFrames: ReadVectorFrame[] = []
	let ip = 0

	while (ip < program.length) {
		const instruction = program[ip]

		switch (instruction.opcode) {
			case 'call':
				valueStack.push(instruction.codec.read(reader))
				ip += 1
				break

			case 'object_new':
				valueStack.push({})
				ip += 1
				break

			case 'object_set': {
				const value = valueStack.pop()
				const object = valueStack[valueStack.length - 1] as Record<
					string,
					unknown
				>
				object[instruction.key] = value
				ip += 1
				break
			}

			case 'vector_start': {
				if (!instruction.bare) {
					const id = readUint32(reader)

					if (id !== VECTOR_ID) {
						throw new Error(
							`Invalid object code, expected ${toBase16(VECTOR_ID)} (vector), got ${toBase16(id)}`,
						)
					}
				}

				const length = readUint32(reader)

				if (length === 0) {
					valueStack.push([])
					ip = instruction.exit
					break
				}

				vectorFrames.push({
					remaining: length,
					values: [],
					exit: instruction.exit,
				})
				ip = instruction.body
				break
			}

			case 'vector_next': {
				const frame = vectorFrames[vectorFrames.length - 1]
				frame.values.push(valueStack.pop())
				frame.remaining -= 1

				if (frame.remaining === 0) {
					vectorFrames.pop()
					valueStack.push(frame.values)
					ip = frame.exit
					break
				}

				ip = instruction.body
				break
			}

			case 'union_dispatch': {
				const id = readUint32(reader)
				const target = instruction.variants.get(id)

				if (target === undefined) {
					throw new Error(`Unknown union variant ${toBase16(id)}`)
				}

				ip = target
				break
			}

			case 'tag':
				valueStack[valueStack.length - 1] = tagValue(
					valueStack[valueStack.length - 1],
					instruction.id,
				)
				ip += 1
				break

			case 'jump':
				ip = instruction.target
				break
		}
	}

	return valueStack[valueStack.length - 1]
}

export const executeWrite = (
	program: WriteProgram,
	writer: Writer,
	rootValue: unknown,
): void => {
	const valueStack: unknown[] = [rootValue]
	const vectorFrames: WriteVectorFrame[] = []
	let ip = 0

	while (ip < program.length) {
		const instruction = program[ip]
		const value = valueStack[valueStack.length - 1]

		switch (instruction.opcode) {
			case 'call':
				instruction.codec.write(writer, value as never)
				ip += 1
				break

			case 'push_field':
				valueStack.push((value as Record<string, unknown>)[instruction.key])
				ip += 1
				break

			case 'pop_value':
				valueStack.pop()
				ip += 1
				break

			case 'vector_start': {
				const values = value as unknown[]

				if (!instruction.bare) {
					writeUint32(writer, VECTOR_ID)
				}

				writeUint32(writer, values.length)

				if (values.length === 0) {
					ip = instruction.exit
					break
				}

				vectorFrames.push({ values, index: 0, exit: instruction.exit })
				valueStack.push(values[0])
				ip = instruction.body
				break
			}

			case 'vector_next': {
				valueStack.pop()
				const frame = vectorFrames[vectorFrames.length - 1]
				frame.index += 1

				if (frame.index === frame.values.length) {
					vectorFrames.pop()
					ip = frame.exit
					break
				}

				valueStack.push(frame.values[frame.index])
				ip = instruction.body
				break
			}

			case 'union_dispatch': {
				const id = (value as { [codecId]: number })[codecId]
				const target = instruction.variants.get(id)

				if (target === undefined) {
					throw new Error(`Unknown union variant ${toBase16(id)}`)
				}

				writeUint32(writer, id)
				ip = target
				break
			}

			case 'jump':
				ip = instruction.target
				break
		}
	}
}
