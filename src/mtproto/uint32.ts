import { Codec } from '../codec.js'

export const uint32 = (): Codec<number> => {
	return {
		read(reader) {
			const value = reader.view.getUint32(reader.offset, true)
			reader.seek(4)
			return value
		},

		write(writer, value) {
			const bytes = new Uint8Array(4)
			new DataView(bytes.buffer).setUint32(0, value, true)
			writer.raw(bytes)
		},
	}
}
