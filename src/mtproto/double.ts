import { Codec } from '../codec.js'

export const double = () => {
	const codec: Codec<number> = (value) => {
		return value
	}

	codec.read = (reader) => {
		const bytes = reader.raw(8)
		return new DataView(
			bytes.buffer,
			bytes.byteOffset,
			bytes.byteLength,
		).getFloat64(0, true)
	}

	codec.write = (writer, value) => {
		const bytes = new Uint8Array(8)
		new DataView(bytes.buffer).setFloat64(0, value, true)
		writer.raw(bytes)
	}

	return codec
}
