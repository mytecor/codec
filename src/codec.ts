import { Reader } from './reader.js'
import { Writer } from './writer.js'

export const codecId = Symbol('codecSchemaId')

export type Codec<T> = {
	(value: T): T

	read(reader: Reader): T
	write(writer: Writer, value: T): void
}

export type TaggedValue<T> = T & {
	[codecId]: number
}

export type TaggedCodec<T> = {
	(value: T): TaggedValue<T>

	read(reader: Reader): TaggedValue<T>
	write(writer: Writer, value: TaggedValue<T>): void

	[codecId]: number
}

export type InferCodec<T> = T extends Codec<infer U> ? U : never
