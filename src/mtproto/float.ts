import { Codec } from '../codec.js'

export const float = () => {
	const codec: Codec<number> = {
		read(reader) {
			const value = reader.view.getFloat32(reader.offset, true)
			reader.seek(4)
			return value
		},
		write(writer, value) {
			const bytes = new Uint8Array(4)
			new DataView(bytes.buffer).setFloat32(0, value, true)
			writer.raw(bytes)
		},
	}

	return codec
}
