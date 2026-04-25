import { Codec } from '../codec.js'
import { uint32 } from './uint32.js'

export const buffer = () => {
	const uint32Parser = uint32()

	const codec: Codec<ArrayBuffer> = (value) => {
		return value
	}

	codec.read = (reader) => {
		const length = uint32Parser.read(reader)
		const start = reader.offset
		const end = start + length

		reader.offset = end
		return reader.bytes.slice(start, end).buffer
	}

	codec.write = (writer, value) => {
		const bytes = new Uint8Array(value)
		uint32Parser.write(writer, bytes.byteLength)
		writer.pushChunk(bytes)
	}

	return codec
}
