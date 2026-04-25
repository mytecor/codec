export class Reader {
	offset = 0
	private readonly uint8View: Uint8Array

	constructor(data: ArrayBuffer | ArrayBufferView, start = 0) {
		if (ArrayBuffer.isView(data)) {
			this.uint8View = new Uint8Array(
				data.buffer,
				data.byteOffset,
				data.byteLength,
			)
		} else {
			this.uint8View = new Uint8Array(data)
		}

		this.offset = start
	}

	raw(length = -1) {
		let size = length

		if (size === -1) {
			size = this.uint8View.length - this.offset
		}

		const value = this.uint8View.subarray(this.offset, this.offset + size)
		this.offset += size
		return value
	}

	seek(delta: number) {
		const position = this.offset + delta

		if (position < 0 || position > this.uint8View.length) {
			throw new RangeError('New position is out of range')
		}

		this.offset = position
	}
}
