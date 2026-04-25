import {
	Codec,
	CodecNode,
	codecNode,
	Reader,
	Writer,
} from '@mytecor/codec-core'
import createDebug from 'debug'
import { executeRead, executeWrite, ReadProgram, WriteProgram } from './vm.js'

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

type VisitTask = {
	type: 'visit'
	codec: Codec<unknown>
	node: CodecNode | undefined
}

type SequenceStepStartTask = {
	type: 'sequence_step_start'
	step: Extract<CodecNode, { kind: 'sequence' }>['steps'][number]
}

type SequenceStepFinishTask = {
	type: 'sequence_step_finish'
	step: Extract<CodecNode, { kind: 'sequence' }>['steps'][number]
}

type BranchCompileState = {
	readInstruction: Extract<ReadProgram[number], { opcode: 'branch' }>
	writeInstruction: Extract<WriteProgram[number], { opcode: 'branch' }>
	readEndJumps: number[]
	writeEndJumps: number[]
}

type BranchCaseStartTask = {
	type: 'branch_case_start'
	branch: Extract<CodecNode, { kind: 'branch' }>['branches'][number]
	state: BranchCompileState
}

type BranchCaseFinishTask = {
	type: 'branch_case_finish'
	branch: Extract<CodecNode, { kind: 'branch' }>['branches'][number]
	state: BranchCompileState
}

type BranchFinishTask = {
	type: 'branch_finish'
	state: BranchCompileState
}

type CompileTask =
	| VisitTask
	| SequenceStepStartTask
	| SequenceStepFinishTask
	| BranchCaseStartTask
	| BranchCaseFinishTask
	| BranchFinishTask

const visitTask = (codec: Codec<unknown>): VisitTask => ({
	type: 'visit',
	codec,
	node: codec[codecNode],
})

const emitCall = (
	codec: Codec<unknown>,
	readProgram: ReadProgram,
	writeProgram: WriteProgram,
): void => {
	readProgram.push({ opcode: 'call', codec })
	writeProgram.push({ opcode: 'call', codec })
}

const scheduleSequence = (
	workStack: CompileTask[],
	node: Extract<CodecNode, { kind: 'sequence' }>,
	readProgram: ReadProgram,
	writeProgram: WriteProgram,
): void => {
	readProgram.push({ opcode: 'create_value', create: node.create })
	scheduleSequenceDebug('%O', {
		stepCount: node.steps.length,
		readProgramLength: readProgram.length,
		writeProgramLength: writeProgram.length,
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
	node: Extract<CodecNode, { kind: 'branch' }>,
	readProgram: ReadProgram,
	writeProgram: WriteProgram,
): void => {
	const state: BranchCompileState = {
		readInstruction: {
			opcode: 'branch',
			selector: node.selector,
			branches: new Map(),
		},
		writeInstruction: {
			opcode: 'branch',
			selector: node.selector,
			select: node.select,
			branches: new Map(),
		},
		readEndJumps: [],
		writeEndJumps: [],
	}

	readProgram.push(state.readInstruction)
	writeProgram.push(state.writeInstruction)
	scheduleBranchDebug('%O', {
		branchCount: node.branches.length,
		readProgramLength: readProgram.length,
		writeProgramLength: writeProgram.length,
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
): { readProgram: ReadProgram; writeProgram: WriteProgram } => {
	const readProgram: ReadProgram = []
	const writeProgram: WriteProgram = []
	const workStack: CompileTask[] = [{ type: 'visit', codec, node }]

	startDebug('%O', { hasNode: node !== undefined })

	while (workStack.length > 0) {
		const task = workStack.pop()
		if (!task) {
			continue
		}

		switch (task.type) {
			case 'visit': {
				taskVisitDebug('%O', {
					hasNode: task.node !== undefined,
					kind: task.node?.kind,
					remainingTasks: workStack.length,
				})

				if (task.node === undefined) {
					emitCall(task.codec, readProgram, writeProgram)
					emitCallDebug('%O', {
						readProgramLength: readProgram.length,
						writeProgramLength: writeProgram.length,
					})
					break
				}

				switch (task.node.kind) {
					case 'sequence':
						scheduleSequence(workStack, task.node, readProgram, writeProgram)
						break

					case 'branch':
						scheduleBranch(workStack, task.node, readProgram, writeProgram)
						break
				}

				break
			}

			case 'sequence_step_start':
				writeProgram.push({ opcode: 'push_value', select: task.step.select })
				emitPushValueDebug('%O', {
					writeProgramLength: writeProgram.length,
				})
				break

			case 'sequence_step_finish':
				readProgram.push({ opcode: 'assign_value', assign: task.step.assign })
				writeProgram.push({ opcode: 'pop_value' })
				emitSequenceStepFinishDebug('%O', {
					readProgramLength: readProgram.length,
					writeProgramLength: writeProgram.length,
				})
				break

			case 'branch_case_start':
				task.state.readInstruction.branches.set(
					task.branch.key,
					readProgram.length,
				)
				task.state.writeInstruction.branches.set(
					task.branch.key,
					writeProgram.length,
				)
				emitBranchCaseStartDebug('%O', {
					key: task.branch.key,
					readTarget: readProgram.length,
					writeTarget: writeProgram.length,
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
					readProgram.push({ opcode: 'map_value', map: task.branch.map })
					emitMapValueDebug('%O', {
						key: task.branch.key,
						readProgramLength: readProgram.length,
					})
				}

				task.state.readEndJumps.push(
					readProgram.push({ opcode: 'jump', target: -1 }) - 1,
				)
				task.state.writeEndJumps.push(
					writeProgram.push({ opcode: 'jump', target: -1 }) - 1,
				)
				emitBranchCaseFinishDebug('%O', {
					key: task.branch.key,
					readProgramLength: readProgram.length,
					writeProgramLength: writeProgram.length,
				})
				break
			}

			case 'branch_finish':
				for (const jumpIndex of task.state.readEndJumps) {
					;(
						readProgram[jumpIndex] as Extract<
							ReadProgram[number],
							{ opcode: 'jump' }
						>
					).target = readProgram.length
				}

				for (const jumpIndex of task.state.writeEndJumps) {
					;(
						writeProgram[jumpIndex] as Extract<
							WriteProgram[number],
							{ opcode: 'jump' }
						>
					).target = writeProgram.length
				}

				emitBranchFinishDebug('%O', {
					readProgramLength: readProgram.length,
					writeProgramLength: writeProgram.length,
				})
				break
		}
	}

	finishDebug('%O', {
		readProgramLength: readProgram.length,
		writeProgramLength: writeProgram.length,
	})

	return { readProgram, writeProgram }
}

export class Compiler<T> {
	private readonly readProgram: ReadProgram
	private readonly writeProgram: WriteProgram

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
		return executeRead(this.readProgram, reader) as T
	}

	write(value: T) {
		const writer = new Writer()
		executeWrite(this.writeProgram, writer, value)
		return writer.finish()
	}
}
