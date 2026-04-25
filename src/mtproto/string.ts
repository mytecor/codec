import { Codec } from '../codec.js'
import { bytes } from './bytes.js'

export const string = (): Codec<string> => {
	const bytesCodec = bytes()

	return {
		read(reader) {
			return new TextDecoder().decode(bytesCodec.read(reader))
		},

		write(writer, value) {
			bytesCodec.write(writer, new TextEncoder().encode(value))
		},
	}
}
