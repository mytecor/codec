import { Codec, codecId, TaggedCodec, TaggedValue } from '../codec.js'
import { uint32 } from './uint32.js'

export const union = <T extends readonly unknown[]>(
	codecs: { [K in keyof T]: TaggedCodec<T[K]> },
) => {
	const uint32Codec = uint32()

	const map = Object.fromEntries(
		Object.values(codecs).map((codec) => {
			return [codec[codecId], codec]
		}),
	)

	const codec: Codec<TaggedValue<T[number]>> = (value) => {
		return value
	}

	codec.read = (reader) => {
		const id = uint32Codec.read(reader)
		return map[id].read(reader)
	}

	codec.write = (writer, value) => {
		const id = value[codecId]
		uint32Codec.write(writer, id)
		map[id].write(writer, value)
	}

	return codec
}
