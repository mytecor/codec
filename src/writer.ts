export class Writer {
	chunks: Uint8Array[] = []
	length = 0

	pushChunk(chunk: Uint8Array) {
		this.chunks.push(chunk)
		this.length += chunk.byteLength
	}

	finish() {
		const result = new Uint8Array(this.length)
		let offset = 0

		for (const chunk of this.chunks) {
			result.set(chunk, offset)
			offset += chunk.byteLength
		}

		return result.buffer
	}
}
