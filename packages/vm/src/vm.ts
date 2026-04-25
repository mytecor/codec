import { Codec, Reader, Writer } from '@mytecor/codec-core'
import createDebug from 'debug'

const vmDebug = createDebug('codec:vm')
const readStartDebug = vmDebug.extend('read:start')
const readFinishDebug = vmDebug.extend('read:finish')
const readInstructionDebug = vmDebug.extend('read:instruction')
const readBranchDebug = vmDebug.extend('read:branch')
const writeStartDebug = vmDebug.extend('write:start')
const writeFinishDebug = vmDebug.extend('write:finish')
const writeInstructionDebug = vmDebug.extend('write:instruction')
const writeBranchDebug = vmDebug.extend('write:branch')

export type ReadInstruction =
	| { opcode: 'call'; codec: Codec<unknown> }
	| { opcode: 'create_value'; create: () => unknown }
	| {
			opcode: 'assign_value'
			assign: (target: unknown, value: unknown) => void
	  }
	| {
			opcode: 'branch'
			selector: Codec<unknown>
			branches: Map<unknown, number>
	  }
	| { opcode: 'map_value'; map: (value: unknown) => unknown }
	| { opcode: 'jump'; target: number }

export type WriteInstruction =
	| { opcode: 'call'; codec: Codec<unknown> }
	| { opcode: 'push_value'; select: (value: unknown) => unknown }
	| { opcode: 'pop_value' }
	| {
			opcode: 'branch'
			selector: Codec<unknown>
			select: (value: unknown) => unknown
			branches: Map<unknown, number>
	  }
	| { opcode: 'jump'; target: number }

export type ReadProgram = ReadInstruction[]
export type WriteProgram = WriteInstruction[]

const describeReadInstruction = (
	instruction: ReadInstruction,
): Record<string, unknown> => {
	switch (instruction.opcode) {
		case 'call':
			return { opcode: instruction.opcode }

		case 'create_value':
			return { opcode: instruction.opcode }

		case 'assign_value':
			return { opcode: instruction.opcode }

		case 'branch':
			return {
				opcode: instruction.opcode,
				branchCount: instruction.branches.size,
			}

		case 'map_value':
			return { opcode: instruction.opcode }

		case 'jump':
			return { opcode: instruction.opcode, target: instruction.target }
	}
}

const describeWriteInstruction = (
	instruction: WriteInstruction,
): Record<string, unknown> => {
	switch (instruction.opcode) {
		case 'call':
			return { opcode: instruction.opcode }

		case 'push_value':
			return { opcode: instruction.opcode }

		case 'pop_value':
			return { opcode: instruction.opcode }

		case 'branch':
			return {
				opcode: instruction.opcode,
				branchCount: instruction.branches.size,
			}

		case 'jump':
			return { opcode: instruction.opcode, target: instruction.target }
	}
}

export const executeRead = (program: ReadProgram, reader: Reader): unknown => {
	const valueStack: unknown[] = []
	let ip = 0

	readStartDebug('%O', { programLength: program.length })

	while (ip < program.length) {
		const instruction = program[ip]
		readInstructionDebug('%O', {
			ip,
			stackDepth: valueStack.length,
			...describeReadInstruction(instruction),
		})

		switch (instruction.opcode) {
			case 'call':
				valueStack.push(instruction.codec.read(reader))
				ip += 1
				break

			case 'create_value':
				valueStack.push(instruction.create())
				ip += 1
				break

			case 'assign_value': {
				const value = valueStack.pop()
				const target = valueStack[valueStack.length - 1]
				instruction.assign(target, value)
				ip += 1
				break
			}

			case 'branch': {
				const key = instruction.selector.read(reader)
				const target = instruction.branches.get(key)

				if (target === undefined) {
					throw new Error(`Missing branch for key ${String(key)}`)
				}

				readBranchDebug('%O', { key, target })
				ip = target
				break
			}

			case 'map_value':
				valueStack[valueStack.length - 1] = instruction.map(
					valueStack[valueStack.length - 1],
				)
				ip += 1
				break

			case 'jump':
				ip = instruction.target
				break
		}
	}

	const result = valueStack[valueStack.length - 1]
	readFinishDebug('%O', {
		stackDepth: valueStack.length,
		result,
	})
	return result
}

export const executeWrite = (
	program: WriteProgram,
	writer: Writer,
	rootValue: unknown,
): void => {
	const valueStack: unknown[] = [rootValue]
	let ip = 0

	writeStartDebug('%O', {
		programLength: program.length,
		rootValue,
	})

	while (ip < program.length) {
		const instruction = program[ip]
		const value = valueStack[valueStack.length - 1]
		writeInstructionDebug('%O', {
			ip,
			stackDepth: valueStack.length,
			value,
			...describeWriteInstruction(instruction),
		})

		switch (instruction.opcode) {
			case 'call':
				instruction.codec.write(writer, value as never)
				ip += 1
				break

			case 'push_value':
				valueStack.push(instruction.select(value))
				ip += 1
				break

			case 'pop_value':
				valueStack.pop()
				ip += 1
				break

			case 'branch': {
				const key = instruction.select(value)
				const target = instruction.branches.get(key)

				if (target === undefined) {
					throw new Error(`Missing branch for key ${String(key)}`)
				}

				instruction.selector.write(writer, key as never)
				writeBranchDebug('%O', { key, target })
				ip = target
				break
			}

			case 'jump':
				ip = instruction.target
				break
		}
	}

	writeFinishDebug('%O', { stackDepth: valueStack.length })
}
