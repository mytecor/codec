import { Codec } from '../codec.js'
import { uint32 } from './uint32.js'

const NULL_ID = 0x56730bcc

export const nullable = () => {
	const uint32Codec = uint32()

	const codec: Codec<null> = {
		read(reader) {
			const value = uint32Codec.read(reader)

			if (value !== NULL_ID) {
				throw new Error(`Expected null, got 0x${value.toString(16)}`)
			}

			return null
		},
		write(writer) {
			uint32Codec.write(writer, NULL_ID)
		},
	}

	return codec
}
