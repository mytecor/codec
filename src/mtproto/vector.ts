import { Codec } from '../codec.js'
import { uint32 } from './uint32.js'

const VECTOR_ID = 0x1cb5c415

export const vector = <T>(item: Codec<T>, bare = false) => {
	const uint32Codec = uint32()

	const codec: Codec<T[]> = {
		read(reader) {
			if (!bare) {
				const id = uint32Codec.read(reader)

				if (id !== VECTOR_ID) {
					throw new Error(
						`Invalid object code, expected 0x1cb5c415 (vector), got 0x${id.toString(16)}`,
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
	}

	return codec
}
