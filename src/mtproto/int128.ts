import { Codec } from '../codec.js'

export const int128 = (): Codec<Uint8Array> => {
	return {
		read(reader) {
			return reader.raw(16)
		},

		write(writer, value) {
			if (value.byteLength !== 16) {
				throw new Error('Invalid int128 length')
			}

			writer.raw(value)
		},
	}
}
