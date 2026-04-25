import { Codec } from '../codec.js'

export const uint32 = () => {
	const codec: Codec<number> = (value) => {
		return value
	}

	codec.read = (reader) => {
		const bytes = reader.raw(4)
		return new DataView(
			bytes.buffer,
			bytes.byteOffset,
			bytes.byteLength,
		).getUint32(0, true)
	}

	codec.write = (writer, value) => {
		const bytes = new Uint8Array(4)
		new DataView(bytes.buffer).setUint32(0, value, true)
		writer.raw(bytes)
	}

	return codec
}
