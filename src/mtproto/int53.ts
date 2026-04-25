import { Codec } from '../codec.js'

const TWO_PWR_32_DBL = 2 ** 32

export const int53 = () => {
	const codec: Codec<number> = (value) => {
		return value
	}

	codec.read = (reader) => {
		const bytes = reader.raw(8)
		const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
		const low = view.getUint32(0, true)
		const high = view.getInt32(4, true)

		return low + TWO_PWR_32_DBL * high
	}

	codec.write = (writer, value) => {
		const bytes = new Uint8Array(8)
		const view = new DataView(bytes.buffer)

		view.setInt32(0, (value % TWO_PWR_32_DBL) | 0, true)

		if (value < 0) {
			view.setInt32(4, (value / TWO_PWR_32_DBL - 1) | 0, true)
		} else {
			view.setInt32(4, (value / TWO_PWR_32_DBL) | 0, true)
		}

		writer.raw(bytes)
	}

	return codec
}
