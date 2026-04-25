import { Codec, codecId, TaggedCodec } from '../codec.js'

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

	return taggedCodec
}
