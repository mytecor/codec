import { Codec } from './codec.js'
import { Reader } from './reader.js'
import { Writer } from './writer.js'

export class Compiler<T> {
	parser: Codec<T>

	constructor(schema: Codec<T>) {
		this.parser = schema
	}

	read(buffer: ArrayBuffer) {
		const reader = new Reader(buffer)
		return this.parser.read(reader)
	}

	write(value: T) {
		const writer = new Writer()
		this.parser.write(writer, value)
		return writer.finish()
	}
}
