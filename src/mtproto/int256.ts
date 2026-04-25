import { Codec } from '../codec.js'

export const int256 = (): Codec<Uint8Array> => {
	return {
		read(reader) {
			return reader.raw(32)
		},

		write(writer, value) {
			if (value.byteLength !== 32) {
				throw new Error('Invalid int256 length')
			}

			writer.raw(value)
		},
	}
}
