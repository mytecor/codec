import { Codec } from '../codec.js'
import { uint32 } from './uint32.js'

export const string = () => {
	const uint32Codec = uint32()

	const codec: Codec<string> = (value) => {
		return value
	}

	codec.read = (reader) => {
		const length = uint32Codec.read(reader)
		const start = reader.offset
		const end = start + length

		reader.offset = end
		return new TextDecoder().decode(reader.bytes.slice(start, end))
	}

	codec.write = (writer, value) => {
		const bytes = new TextEncoder().encode(value)
		uint32Codec.write(writer, bytes.byteLength)
		writer.pushChunk(bytes)
	}

	return codec
}
