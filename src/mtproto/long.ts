import { Codec } from '../codec.js'

export const long = (unsigned = false) => {
	const codec: Codec<bigint> = (value) => {
		return value
	}

	codec.read = (reader) => {
		const bytes = reader.raw(8)
		const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
		const low = BigInt(view.getUint32(0, true))
		const high = BigInt(view.getUint32(4, true))
		const value = (high << 32n) | low

		if (unsigned) return value
		if (value < 0x8000000000000000n) return value

		return value - 0x10000000000000000n
	}

	codec.write = (writer, value) => {
		const normalized = BigInt.asUintN(64, value)
		const bytes = new Uint8Array(8)
		const view = new DataView(bytes.buffer)

		view.setUint32(0, Number(normalized & 0xffffffffn), true)
		view.setUint32(4, Number(normalized >> 32n), true)

		writer.raw(bytes)
	}

	return codec
}
