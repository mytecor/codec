import { Codec, toBase16 } from '@mytecor/codec'
import { uint32 } from './uint32.js'

const NULL_ID = 0x56730bcc

export const nullable = (): Codec<null> => {
	const uint32Codec = uint32()

	return {
		read(reader) {
			const value = uint32Codec.read(reader)

			if (value !== NULL_ID) {
				throw new Error(`Expected null, got ${toBase16(value)}`)
			}

			return null
		},

		write(writer) {
			uint32Codec.write(writer, NULL_ID)
		},
	}
}
