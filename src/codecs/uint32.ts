import { Codec } from '../codec.js'

export const uint32 = () => {
	const codec: Codec<number> = (value) => {
		return value
	}

	codec.read = (reader) => {
		const value = reader.view.getUint32(reader.offset, true)
		reader.offset += 4
		return value
	}

	codec.write = (writer, value) => {
		const bytes = new Uint8Array(4)
		new DataView(bytes.buffer).setUint32(0, value, true)
		writer.pushChunk(bytes)
	}

	return codec
}
