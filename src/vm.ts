import { Codec, codecId } from './codec.js'
import { Reader } from './reader.js'
import { toBase16 } from './toBase16.js'
import { Writer } from './writer.js'

const VECTOR_ID = 0x1cb5c415

export type ReadInstruction =
	| { opcode: 'call'; codec: Codec<unknown> }
	| { opcode: 'object_start' }
	| { opcode: 'object_set'; key: string }
	| { opcode: 'vector'; bare: boolean; item: ReadProgram }
	| { opcode: 'union'; variants: Map<number, ReadProgram> }
	| { opcode: 'tag'; id: number }

export type WriteInstruction =
	| { opcode: 'call'; codec: Codec<unknown> }
	| { opcode: 'field'; key: string; program: WriteProgram }
	| { opcode: 'vector'; bare: boolean; item: WriteProgram }
	| { opcode: 'union'; variants: Map<number, WriteProgram> }

export type ReadProgram = ReadInstruction[]
export type WriteProgram = WriteInstruction[]

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
	const stack: unknown[] = []

	for (const instruction of program) {
		switch (instruction.opcode) {
			case 'call':
				stack.push(instruction.codec.read(reader))
				break

			case 'object_start':
				stack.push({})
				break

			case 'object_set': {
				const value = stack.pop()
				const object = stack[stack.length - 1] as Record<string, unknown>
				object[instruction.key] = value
				break
			}

			case 'vector': {
				if (!instruction.bare) {
					const id = readUint32(reader)

					if (id !== VECTOR_ID) {
						throw new Error(
							`Invalid object code, expected ${toBase16(VECTOR_ID)} (vector), got ${toBase16(id)}`,
						)
					}
				}

				const length = readUint32(reader)
				const values: unknown[] = []

				for (let index = 0; index < length; index++) {
					values.push(executeRead(instruction.item, reader))
				}

				stack.push(values)
				break
			}

			case 'union': {
				const id = readUint32(reader)
				const variant = instruction.variants.get(id)

				if (variant === undefined) {
					throw new Error(`Unknown union variant ${toBase16(id)}`)
				}

				stack.push(executeRead(variant, reader))
				break
			}

			case 'tag':
				stack[stack.length - 1] = tagValue(
					stack[stack.length - 1],
					instruction.id,
				)
				break
		}
	}

	return stack[stack.length - 1]
}

export const executeWrite = (
	program: WriteProgram,
	writer: Writer,
	value: unknown,
): void => {
	for (const instruction of program) {
		switch (instruction.opcode) {
			case 'call':
				instruction.codec.write(writer, value as never)
				break

			case 'field':
				executeWrite(
					instruction.program,
					writer,
					(value as Record<string, unknown>)[instruction.key],
				)
				break

			case 'vector': {
				const values = value as unknown[]

				if (!instruction.bare) {
					writeUint32(writer, VECTOR_ID)
				}

				writeUint32(writer, values.length)

				for (const item of values) {
					executeWrite(instruction.item, writer, item)
				}
				break
			}

			case 'union': {
				const id = (value as { [codecId]: number })[codecId]
				const variant = instruction.variants.get(id)

				if (variant === undefined) {
					throw new Error(`Unknown union variant ${toBase16(id)}`)
				}

				writeUint32(writer, id)
				executeWrite(variant, writer, value)
				break
			}
		}
	}
}
