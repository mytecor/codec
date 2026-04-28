import {
	Codec,
	CodecNode,
	codecNode,
	Reader,
	Writer,
} from '@mytecor/codec-core'
import createDebug from 'debug'
import { execute, Program } from './vm.js'

const compilerDebug = createDebug('codec:compiler')
const startDebug = compilerDebug.extend('start')
const finishDebug = compilerDebug.extend('finish')
const scheduleSequenceDebug = compilerDebug.extend('schedule:sequence')
const scheduleBranchDebug = compilerDebug.extend('schedule:branch')
const taskVisitDebug = compilerDebug.extend('task:visit')
const emitCallDebug = compilerDebug.extend('emit:call')
const emitPushValueDebug = compilerDebug.extend('emit:push_value')
const emitSequenceStepFinishDebug = compilerDebug.extend(
	'emit:sequence_step_finish',
)
const emitBranchCaseStartDebug = compilerDebug.extend('emit:branch_case_start')
const emitMapValueDebug = compilerDebug.extend('emit:map_value')
const emitBranchCaseFinishDebug = compilerDebug.extend(
	'emit:branch_case_finish',
)
const emitBranchFinishDebug = compilerDebug.extend('emit:branch_finish')

type SequenceNode = Extract<CodecNode, { kind: 'sequence' }>
type BranchNode = Extract<CodecNode, { kind: 'branch' }>
type SequenceStep = SequenceNode['steps'][number]
type BranchCase = BranchNode['branches'][number]
type ReadBranchInstruction = Extract<Program[number], { opcode: 'read_branch' }>
type WriteBranchInstruction = Extract<
	Program[number],
	{ opcode: 'write_branch' }
>

class CompileContext {
	readonly readProgram: Program = []
	readonly writeProgram: Program = []

	pushRead<T extends Program[number]>(instruction: T): number {
		return pushInstruction(this.readProgram, instruction)
	}

	pushWrite<T extends Program[number]>(instruction: T): number {
		return pushInstruction(this.writeProgram, instruction)
	}
}

type BranchCompileSide<TInstruction extends Program[number]> = {
	program: Program
	instruction: TInstruction
	endJumps: number[]
}

type ReadBranchCompileSide = BranchCompileSide<ReadBranchInstruction>
type WriteBranchCompileSide = BranchCompileSide<WriteBranchInstruction>

class BranchCompileState {
	private readonly context: CompileContext
	readonly read: ReadBranchCompileSide
	readonly write: WriteBranchCompileSide

	constructor(node: BranchNode, context: CompileContext) {
		this.context = context
		this.read = {
			program: context.readProgram,
			instruction: {
				opcode: 'read_branch',
				selector: node.selector,
				branches: new Map(),
			},
			endJumps: [],
		}
		this.write = {
			program: context.writeProgram,
			instruction: {
				opcode: 'write_branch',
				selector: node.selector,
				select: node.select,
				branches: new Map(),
			},
			endJumps: [],
		}
	}

	pushInstructions(): void {
		this.context.pushRead(this.read.instruction)
		this.context.pushWrite(this.write.instruction)
	}

	setBranches(key: BranchCase['key']): void {
		this.read.instruction.branches.set(key, this.read.program.length)
		this.write.instruction.branches.set(key, this.write.program.length)
	}

	pushEndJumps(): void {
		this.read.endJumps.push(
			this.context.pushRead({ opcode: 'jump', target: -1 }),
		)
		this.write.endJumps.push(
			this.context.pushWrite({ opcode: 'jump', target: -1 }),
		)
	}

	patchJumps(): void {
		patchJumps(this.read.program, this.read.endJumps)
		patchJumps(this.write.program, this.write.endJumps)
	}
}

type CompileTask =
	| { type: 'visit'; codec: Codec<unknown>; node: CodecNode | undefined }
	| { type: 'sequence_step_start'; step: SequenceStep }
	| { type: 'sequence_step_finish'; step: SequenceStep }
	| { type: 'branch_case_start'; branch: BranchCase; state: BranchCompileState }
	| {
			type: 'branch_case_finish'
			branch: BranchCase
			state: BranchCompileState
	  }
	| { type: 'branch_finish'; state: BranchCompileState }

const visitTask = (codec: Codec<unknown>): CompileTask => ({
	type: 'visit',
	codec,
	node: codec[codecNode],
})

const pushInstruction = <T extends Program[number]>(
	program: Program,
	instruction: T,
): number => {
	program.push(instruction)
	return program.length - 1
}

const patchJumps = (program: Program, jumpIndexes: number[]): void => {
	for (const jumpIndex of jumpIndexes) {
		const instruction = program[jumpIndex]
		if (instruction?.opcode === 'jump') {
			instruction.target = program.length
		}
	}
}

const emitCall = (codec: Codec<unknown>, context: CompileContext): void => {
	context.pushRead({ opcode: 'read_call', codec })
	context.pushWrite({ opcode: 'write_call', codec })
}

const scheduleSequence = (
	workStack: CompileTask[],
	node: SequenceNode,
	context: CompileContext,
): void => {
	context.pushRead({ opcode: 'create_value', create: node.create })
	scheduleSequenceDebug('%O', {
		stepCount: node.steps.length,
		context,
	})

	for (let index = node.steps.length - 1; index >= 0; index -= 1) {
		const step = node.steps[index]
		workStack.push({ type: 'sequence_step_finish', step })
		workStack.push(visitTask(step.codec))
		workStack.push({ type: 'sequence_step_start', step })
	}
}

const scheduleBranch = (
	workStack: CompileTask[],
	node: BranchNode,
	context: CompileContext,
): void => {
	const state = new BranchCompileState(node, context)

	state.pushInstructions()
	scheduleBranchDebug('%O', {
		branchCount: node.branches.length,
		context,
	})

	workStack.push({ type: 'branch_finish', state })
	for (let index = node.branches.length - 1; index >= 0; index -= 1) {
		workStack.push({
			type: 'branch_case_start',
			branch: node.branches[index],
			state,
		})
	}
}

const buildPrograms = (
	codec: Codec<unknown>,
	node: CodecNode | undefined,
): { readProgram: Program; writeProgram: Program } => {
	const context = new CompileContext()
	const workStack: CompileTask[] = [{ type: 'visit', codec, node }]

	startDebug('%O', { hasNode: node !== undefined })

	while (true) {
		const task = workStack.pop()
		if (!task) {
			break
		}
		switch (task.type) {
			case 'visit': {
				taskVisitDebug('%O', {
					hasNode: task.node !== undefined,
					kind: task.node?.kind,
					remainingTasks: workStack.length,
				})

				if (task.node === undefined) {
					emitCall(task.codec, context)
					emitCallDebug('%O', {context})
					break
				}

				switch (task.node.kind) {
					case 'sequence':
						scheduleSequence(workStack, task.node, context)
						break

					case 'branch':
						scheduleBranch(workStack, task.node, context)
						break
				}

				break
			}

			case 'sequence_step_start':
				context.pushWrite({ opcode: 'push_value', select: task.step.select })
				emitPushValueDebug('%O', {context})
				break

			case 'sequence_step_finish':
				context.pushRead({ opcode: 'assign_value', assign: task.step.assign })
				context.pushWrite({ opcode: 'pop_value' })
				emitSequenceStepFinishDebug('%O', {context})
				break

			case 'branch_case_start':
				task.state.setBranches(task.branch.key)
				emitBranchCaseStartDebug('%O', {
					key: task.branch.key,
					context,
				})
				workStack.push({
					type: 'branch_case_finish',
					branch: task.branch,
					state: task.state,
				})
				workStack.push(visitTask(task.branch.codec))
				break

			case 'branch_case_finish': {
				if (task.branch.map) {
					context.pushRead({ opcode: 'map_value', map: task.branch.map })
					emitMapValueDebug('%O', {
						key: task.branch.key,
						context,
					})
				}

				task.state.pushEndJumps()
				emitBranchCaseFinishDebug('%O', {
					key: task.branch.key,
					context,
				})
				break
			}

			case 'branch_finish':
				task.state.patchJumps()

				emitBranchFinishDebug('%O', {
					context,
				})
				break
		}
	}

	finishDebug('%O', {context})

	return context
}

export class Compiler<T> {
	private readonly readProgram: Program
	private readonly writeProgram: Program

	constructor(readonly schema: Codec<T>) {
		const { readProgram, writeProgram } = buildPrograms(
			schema,
			schema[codecNode],
		)
		this.readProgram = readProgram
		this.writeProgram = writeProgram
	}

	read(buffer: ArrayBuffer) {
		const reader = new Reader(buffer)
		const valueStack: unknown[] = []
		execute(this.readProgram, valueStack, reader)
		return valueStack[valueStack.length - 1] as T
	}

	write(value: T) {
		const writer = new Writer()
		execute(this.writeProgram, [value], writer)
		return writer.finish()
	}
}
