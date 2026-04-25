import { Codec } from '../codec.js'

export const bytes = () => {
	const codec: Codec<Uint8Array> = {
		read(reader) {
			const firstByte = reader.view.getUint8(reader.offset)
			reader.seek(1)
			let length: number
			let padding: number

			if (firstByte === 254) {
				length =
					reader.view.getUint8(reader.offset) |
					(reader.view.getUint8(reader.offset + 1) << 8) |
					(reader.view.getUint8(reader.offset + 2) << 16)
				reader.seek(3)
				padding = length % 4
			} else {
				length = firstByte
				padding = (length + 1) % 4
			}

			const value = reader.raw(length)

			if (padding > 0) {
				reader.seek(4 - padding)
			}

			return value
		},
		write(writer, value) {
			const length = value.byteLength
			let padding: number

			if (length <= 253) {
				writer.raw(Uint8Array.of(length))
				padding = (length + 1) % 4
			} else {
				writer.raw(
					Uint8Array.of(
						254,
						length & 0xff,
						(length >> 8) & 0xff,
						(length >> 16) & 0xff,
					),
				)
				padding = length % 4
			}

			writer.raw(value)

			if (padding > 0) {
				writer.raw(new Uint8Array(4 - padding))
			}
		},
	}

	return codec
}
