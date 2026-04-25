import { Codec } from '../codec.js'

export const int32 = () => {
	const codec: Codec<number> = {
		read(reader) {
			const value = reader.view.getInt32(reader.offset, true)
			reader.seek(4)
			return value
		},
		write(writer, value) {
			const bytes = new Uint8Array(4)
			new DataView(bytes.buffer).setInt32(0, value, true)
			writer.raw(bytes)
		},
	}

	return codec
}
