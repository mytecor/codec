import { Codec, Reader, Writer } from '@mytecor/codec-core'
import createDebug from 'debug'

const vmDebug = createDebug('codec:vm')
const startDebug = vmDebug.extend('start')
const finishDebug = vmDebug.extend('finish')
const instructionDebug = vmDebug.extend('instruction')
const branchDebug = vmDebug.extend('branch')

type ReadCallInstruction = { opcode: 'read_call'; codec: Codec<unknown> }
type WriteCallInstruction = { opcode: 'write_call'; codec: Codec<unknown> }
type CreateValueInstruction = { opcode: 'create_value'; create: () => unknown }
type AssignValueInstruction = {
	opcode: 'assign_value'
	assign: (target: unknown, value: unknown) => void
}
type ReadBranchInstruction = {
	opcode: 'read_branch'
	selector: Codec<unknown>
	branches: Map<unknown, number>
}
type MapValueInstruction = {
	opcode: 'map_value'
	map: (value: unknown) => unknown
}
type PushValueInstruction = {
	opcode: 'push_value'
	select: (value: unknown) => unknown
}
type PopValueInstruction = { opcode: 'pop_value' }
type WriteBranchInstruction = {
	opcode: 'write_branch'
	selector: Codec<unknown>
	select: (value: unknown) => unknown
	branches: Map<unknown, number>
}
type JumpInstruction = { opcode: 'jump'; target: number }

export type Instruction =
	| ReadCallInstruction
	| WriteCallInstruction
	| CreateValueInstruction
	| AssignValueInstruction
	| ReadBranchInstruction
	| MapValueInstruction
	| PushValueInstruction
	| PopValueInstruction
	| WriteBranchInstruction
	| JumpInstruction

export type Program = Array<Instruction>

const debugInstruction = (
	ip: number,
	valueStack: unknown[],
	value: unknown,
	instruction: Instruction,
): void => {
	instructionDebug('%O', {
		ip,
		stackDepth: valueStack.length,
		value,
		instruction,
	})
}

export const execute = (
	program: Program,
	valueStack: unknown[],
	io: Reader | Writer,
): void => {
	let ip = 0

	startDebug('%O', {
		programLength: program.length,
		rootValue: valueStack[0],
	})

	while (ip < program.length) {
		const instruction = program[ip]
		const value = valueStack[valueStack.length - 1]

		switch (instruction.opcode) {
			case 'read_call':
				debugInstruction(ip, valueStack, value, instruction)
				valueStack.push(instruction.codec.read(io as Reader))
				ip += 1
				break

			case 'write_call':
				debugInstruction(ip, valueStack, value, instruction)
				instruction.codec.write(io as Writer, value as never)
				ip += 1
				break

			case 'create_value':
				debugInstruction(ip, valueStack, value, instruction)
				valueStack.push(instruction.create())
				ip += 1
				break

			case 'assign_value': {
				debugInstruction(ip, valueStack, value, instruction)
				const assignedValue = valueStack.pop()
				const target = valueStack[valueStack.length - 1]
				instruction.assign(target, assignedValue)
				ip += 1
				break
			}

			case 'push_value':
				debugInstruction(ip, valueStack, value, instruction)
				valueStack.push(instruction.select(value))
				ip += 1
				break

			case 'pop_value':
				debugInstruction(ip, valueStack, value, instruction)
				valueStack.pop()
				ip += 1
				break

			case 'read_branch': {
				debugInstruction(ip, valueStack, value, instruction)
				const key = instruction.selector.read(io as Reader)
				const target = instruction.branches.get(key)

				if (target === undefined) {
					throw new Error(`Missing branch for key ${String(key)}`)
				}

				branchDebug('%O', { key, target })
				ip = target
				break
			}

			case 'write_branch': {
				debugInstruction(ip, valueStack, value, instruction)
				const key = instruction.select(value)
				const target = instruction.branches.get(key)

				if (target === undefined) {
					throw new Error(`Missing branch for key ${String(key)}`)
				}

				instruction.selector.write(io as Writer, key as never)
				branchDebug('%O', { key, target })
				ip = target
				break
			}

			case 'map_value':
				debugInstruction(ip, valueStack, value, instruction)
				valueStack[valueStack.length - 1] = instruction.map(
					valueStack[valueStack.length - 1],
				)
				ip += 1
				break

			case 'jump':
				debugInstruction(ip, valueStack, value, instruction)
				ip = instruction.target
				break
		}
	}

	finishDebug('%O', {
		stackDepth: valueStack.length,
		result: valueStack[valueStack.length - 1],
	})
}
