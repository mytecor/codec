import { Codec } from '../codec.js'

export const float = () => {
	const codec: Codec<number> = (value) => {
		return value
	}

	codec.read = (reader) => {
		const bytes = reader.raw(4)
		return new DataView(
			bytes.buffer,
			bytes.byteOffset,
			bytes.byteLength,
		).getFloat32(0, true)
	}

	codec.write = (writer, value) => {
		const bytes = new Uint8Array(4)
		new DataView(bytes.buffer).setFloat32(0, value, true)
		writer.raw(bytes)
	}

	return codec
}
