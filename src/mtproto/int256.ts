import { Codec } from '../codec.js'

export const int256 = () => {
	const codec: Codec<Uint8Array> = (value) => {
		return value
	}

	codec.read = (reader) => {
		return reader.raw(32)
	}

	codec.write = (writer, value) => {
		if (value.byteLength !== 32) {
			throw new Error('Invalid int256 length')
		}

		writer.raw(value)
	}

	return codec
}
