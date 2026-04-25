import { Codec } from '../codec.js'
import { bytes } from './bytes.js'

export const buffer = () => {
	const bytesCodec = bytes()

	const codec: Codec<ArrayBuffer> = (value) => {
		return value
	}

	codec.read = (reader) => {
		return bytesCodec.read(reader).slice().buffer
	}

	codec.write = (writer, value) => {
		bytesCodec.write(writer, new Uint8Array(value))
	}

	return codec
}
