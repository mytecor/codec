import { Codec } from '../codec.js'

export const double = () => {
	const codec: Codec<number> = {
		read(reader) {
			const value = reader.view.getFloat64(reader.offset, true)
			reader.seek(8)
			return value
		},
		write(writer, value) {
			const bytes = new Uint8Array(8)
			new DataView(bytes.buffer).setFloat64(0, value, true)
			writer.raw(bytes)
		},
	}

	return codec
}
