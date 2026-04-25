import { Codec, codecId, TaggedCodec, TaggedValue } from '../codec.js'
import { uint32 } from './uint32.js'

export const union = <T extends readonly unknown[]>(
	codecs: { [K in keyof T]: TaggedCodec<T[K]> },
): Codec<TaggedValue<T[number]>> => {
	const uint32Codec = uint32()

	const map = Object.fromEntries(
		Object.values(codecs).map((codec) => {
			return [codec[codecId], codec]
		}),
	)

	return {
		read(reader) {
			const id = uint32Codec.read(reader)
			return map[id].read(reader)
		},

		write(writer, value) {
			const id = value[codecId]
			uint32Codec.write(writer, id)
			map[id].write(writer, value)
		},
	}
}
