import { Codec } from '../codec.js'
import { bytes } from './bytes.js'

export const string = () => {
	const bytesCodec = bytes()

	const codec: Codec<string> = (value) => {
		return value
	}

	codec.read = (reader) => {
		return new TextDecoder().decode(bytesCodec.read(reader))
	}

	codec.write = (writer, value) => {
		bytesCodec.write(writer, new TextEncoder().encode(value))
	}

	return codec
}
