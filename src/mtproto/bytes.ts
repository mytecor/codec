import { Codec } from '../codec.js'
import { Reader } from '../reader.js'
import { Writer } from '../writer.js'

const SHORT_BYTES_MAX_LENGTH = 253
const LONG_BYTES_MARKER = 254
const MAX_LONG_BYTES_LENGTH = 0xffffff
const ALIGNMENT = 4

const readUint24LE = (view: DataView, offset: number): number => {
	return (
		view.getUint8(offset) |
		(view.getUint8(offset + 1) << 8) |
		(view.getUint8(offset + 2) << 16)
	)
}

const getPadding = (length: number, prefixSize: number): number => {
	return (ALIGNMENT - ((length + prefixSize) % ALIGNMENT)) % ALIGNMENT
}

const readBytesHeader = (
	reader: Reader,
): { length: number; prefixSize: number } => {
	const firstByte = reader.view.getUint8(reader.offset)
	reader.seek(1)

	if (firstByte !== LONG_BYTES_MARKER) {
		return { length: firstByte, prefixSize: 1 }
	}

	const length = readUint24LE(reader.view, reader.offset)
	reader.seek(3)

	return { length, prefixSize: ALIGNMENT }
}

const writeBytesHeader = (writer: Writer, length: number): number => {
	if (length > MAX_LONG_BYTES_LENGTH) {
		throw new Error('MTProto bytes length exceeds 24-bit limit')
	}

	if (length <= SHORT_BYTES_MAX_LENGTH) {
		writer.raw(Uint8Array.of(length))
		return 1
	}

	writer.raw(
		Uint8Array.of(
			LONG_BYTES_MARKER,
			length & 0xff,
			(length >> 8) & 0xff,
			(length >> 16) & 0xff,
		),
	)

	return ALIGNMENT
}

export const bytes = (): Codec<Uint8Array> => {
	return {
		read(reader) {
			const { length, prefixSize } = readBytesHeader(reader)
			const value = reader.raw(length)
			const padding = getPadding(length, prefixSize)

			if (padding > 0) {
				reader.seek(padding)
			}

			return value
    },

		write(writer, value) {
			const length = value.byteLength
			const prefixSize = writeBytesHeader(writer, length)

			writer.raw(value)
			const padding = getPadding(length, prefixSize)

			if (padding > 0) {
				writer.raw(new Uint8Array(padding))
			}
		},
	}
}
