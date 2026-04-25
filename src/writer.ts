export class Writer {
	private readonly chunks: Uint8Array[] = []
	private length = 0

	private writeChunk(chunk: Uint8Array) {
		this.chunks.push(chunk)
		this.length += chunk.byteLength
	}

	raw(value: Uint8Array) {
		this.writeChunk(value)
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
