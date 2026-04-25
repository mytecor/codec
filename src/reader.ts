export class Reader {
	private position = 0
	private readonly uint8View: Uint8Array
	readonly view: DataView

	constructor(data: ArrayBuffer | ArrayBufferView, start = 0) {
		if (ArrayBuffer.isView(data)) {
			this.uint8View = new Uint8Array(
				data.buffer,
				data.byteOffset,
				data.byteLength,
			)
			this.view = new DataView(data.buffer, data.byteOffset, data.byteLength)
		} else {
			this.uint8View = new Uint8Array(data)
			this.view = new DataView(data)
		}

		this.position = start
	}

	get offset() {
		return this.position
	}

	raw(length = -1) {
		let size = length

		if (size === -1) {
			size = this.uint8View.length - this.position
		}

		const value = this.uint8View.subarray(this.position, this.position + size)
		this.position += size
		return value
	}

	seek(delta: number) {
		const position = this.position + delta

		if (position < 0 || position > this.uint8View.length) {
			throw new RangeError('New position is out of range')
		}

		this.position = position
	}
}
