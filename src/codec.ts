import { Reader } from './reader.js'
import { Writer } from './writer.js'

export const codecId = Symbol('codecSchemaId')
export const codecNode = Symbol('codecSchemaNode')
export const codecInner = Symbol('codecInner')

export type SequenceCodecStep = {
	codec: Codec<unknown>
	select: (value: unknown) => unknown
	assign: (target: unknown, value: unknown) => void
}

export type SequenceCodecNode = {
	kind: 'sequence'
	create: () => unknown
	steps: SequenceCodecStep[]
}

export type BranchCodecBranch = {
	key: unknown
	codec: Codec<unknown>
	map?: (value: unknown) => unknown
}

export type BranchCodecNode = {
	kind: 'branch'
	selector: Codec<unknown>
	select: (value: unknown) => unknown
	branches: BranchCodecBranch[]
}

export type CodecNode = SequenceCodecNode | BranchCodecNode

export type Codec<T> = {
	read(reader: Reader): T
	write(writer: Writer, value: T): void
	[codecNode]?: CodecNode
}

export type TaggedValue<T> = T & {
	[codecId]: number
}

export type TaggedCodec<T> = {
	(value: T): TaggedValue<T>

	read(reader: Reader): TaggedValue<T>
	write(writer: Writer, value: TaggedValue<T>): void

	[codecId]: number
	[codecInner]: Codec<T>
}

export type InferCodec<T> = T extends Codec<infer U> ? U : never

export const defineCodec = <T>(codec: Codec<T>, node: CodecNode): Codec<T> => {
	codec[codecNode] = node
	return codec
}

export const sequence = <T>(
	codec: Codec<T>,
	node: Omit<SequenceCodecNode, 'kind'>,
): Codec<T> => {
	return defineCodec(codec, { kind: 'sequence', ...node })
}

export const branch = <T>(
	codec: Codec<T>,
	node: Omit<BranchCodecNode, 'kind'>,
): Codec<T> => {
	return defineCodec(codec, { kind: 'branch', ...node })
}
