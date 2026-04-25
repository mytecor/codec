import { Codec } from '../codec.js'

export const long = (unsigned = false): Codec<bigint> => {
	return {
		read(reader) {
			const low = BigInt(reader.view.getUint32(reader.offset, true))
			const high = BigInt(reader.view.getUint32(reader.offset + 4, true))
			reader.seek(8)
			const value = (high << 32n) | low

			if (unsigned) {
				return value
			}
			if (value < 0x8000000000000000n) {
				return value
			}

			return value - 0x10000000000000000n
		},

		write(writer, value) {
			const normalized = BigInt.asUintN(64, value)
			const bytes = new Uint8Array(8)
			const view = new DataView(bytes.buffer)

			view.setUint32(0, Number(normalized & 0xffffffffn), true)
			view.setUint32(4, Number(normalized >> 32n), true)

			writer.raw(bytes)
		},
	}
}
