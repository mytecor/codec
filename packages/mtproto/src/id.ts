import { Codec, codecId, codecInner, TaggedCodec } from '@mytecor/codec-core'
import { defineMtprotoCodec } from './node.js'

export const id = <T>(codec: Codec<T>, id: number) => {
	const tag = (object: T) => {
		Object.defineProperty(object, codecId, {
			value: id,
			enumerable: false,
			configurable: false,
		})

		return object as ReturnType<TaggedCodec<T>>
	}

	const taggedCodec: TaggedCodec<T> = (value) => {
		return tag(value)
	}

	taggedCodec.read = (reader) => tag(codec.read(reader))
	taggedCodec.write = codec.write
	taggedCodec[codecId] = id
	taggedCodec[codecInner] = codec

	return defineMtprotoCodec(taggedCodec as Codec<unknown>, {
		kind: 'tagged',
		id,
		codec: codec as Codec<unknown>,
	}) as TaggedCodec<T>
}
