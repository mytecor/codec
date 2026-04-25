export class Reader {
	offset = 0
	view: DataView
	bytes: Uint8Array

	constructor(public buffer: ArrayBuffer) {
		this.view = new DataView(buffer)
		this.bytes = new Uint8Array(buffer)
	}
}
