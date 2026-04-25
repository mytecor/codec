import { Codec, defineCodec } from '../codec.js'
import { toBase16 } from '../toBase16.js'
import { uint32 } from './uint32.js'

const VECTOR_ID = 0x1cb5c415

export const vector = <T>(item: Codec<T>, bare = false): Codec<T[]> => {
	const uint32Codec = uint32()

	return defineCodec(
		{
			read(reader) {
				if (!bare) {
					const id = uint32Codec.read(reader)

					if (id !== VECTOR_ID) {
						throw new Error(
							`Invalid object code, expected ${toBase16(VECTOR_ID)} (vector), got ${toBase16(id)}`,
						)
					}
				}

				const length = uint32Codec.read(reader)
				const values: T[] = []

				for (let index = 0; index < length; index++) {
					values.push(item.read(reader))
				}

				return values
			},

			write(writer, values) {
				if (!bare) {
					uint32Codec.write(writer, VECTOR_ID)
				}

				uint32Codec.write(writer, values.length)

				for (const value of values) {
					item.write(writer, value)
				}
			},
		},
		{ kind: 'vector', item, bare },
	)
}
