import { Codec } from '../codec.js'

export const int = () => {
	const codec: Codec<number> = (value) => {
		return value
	}

	codec.read = (reader) => {
		const bytes = reader.raw(4)
		return new DataView(
			bytes.buffer,
			bytes.byteOffset,
			bytes.byteLength,
		).getInt32(0, true)
	}

	codec.write = (writer, value) => {
		const bytes = new Uint8Array(4)
		new DataView(bytes.buffer).setInt32(0, value, true)
		writer.raw(bytes)
	}

	return codec
}
