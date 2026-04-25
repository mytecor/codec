import { Codec } from '../codec.js'
import { toBase16 } from '../toBase16.js'
import { uint32 } from './uint32.js'

const BOOL_TRUE = 0x997275b5
const BOOL_FALSE = 0xbc799737

export const bool = (): Codec<boolean> => {
	const uint32Codec = uint32()

	return {
		read(reader) {
			const value = uint32Codec.read(reader)

			if (value === BOOL_FALSE) {
				return false
			}
			if (value === BOOL_TRUE) {
				return true
			}

			throw new Error(
				`Expected either ${toBase16(BOOL_TRUE)} or ${toBase16(BOOL_FALSE)}, got ${toBase16(value)}`,
			)
		},

		write(writer, value) {
			uint32Codec.write(writer, value ? BOOL_TRUE : BOOL_FALSE)
		},
	}
}
