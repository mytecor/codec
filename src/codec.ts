import { Reader } from './reader.js'
import { Writer } from './writer.js'

export const codecId = Symbol('codecSchemaId')
export const codecNode = Symbol('codecSchemaNode')

export type ObjectCodecNode = {
	kind: 'object'
	shape: Record<string, Codec<unknown>>
}

export type VectorCodecNode = {
	kind: 'vector'
	item: Codec<unknown>
	bare: boolean
}

export type UnionCodecNode = {
	kind: 'union'
	codecs: TaggedCodec<unknown>[]
}

export type TaggedCodecNode = {
	kind: 'tagged'
	id: number
	codec: Codec<unknown>
}

export type CodecNode =
	| ObjectCodecNode
	| VectorCodecNode
	| UnionCodecNode
	| TaggedCodecNode

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
	[codecNode]?: CodecNode
}

export type InferCodec<T> = T extends Codec<infer U> ? U : never

export const defineCodec = <T>(codec: Codec<T>, node: CodecNode): Codec<T> => {
	codec[codecNode] = node
	return codec
}
