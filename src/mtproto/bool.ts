import { Codec } from '../codec.js'
import { uint32 } from './uint32.js'

const BOOL_FALSE = 0xbc799737
const BOOL_TRUE = 0x997275b5

export const bool = () => {
	const uint32Codec = uint32()

	const codec: Codec<boolean> = {
		read(reader) {
			const value = uint32Codec.read(reader)

			if (value === BOOL_FALSE) {
				return false
			}
			if (value === BOOL_TRUE) {
				return true
			}

			throw new Error(
				`Expected either boolTrue or boolFalse, got 0x${value.toString(16)}`,
			)
		},
		write(writer, value) {
			uint32Codec.write(writer, value ? BOOL_TRUE : BOOL_FALSE)
		},
	}

	return codec
}
