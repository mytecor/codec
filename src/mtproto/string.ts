import { Codec } from '../codec.js'
import { bytes } from './bytes.js'

export const string = () => {
	const bytesCodec = bytes()

	const codec: Codec<string> = {
		read(reader) {
			return new TextDecoder().decode(bytesCodec.read(reader))
		},
		write(writer, value) {
			bytesCodec.write(writer, new TextEncoder().encode(value))
		},
	}

	return codec
}
