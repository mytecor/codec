import { Codec } from '../codec.js'

const TWO_PWR_32_DBL = 2 ** 32

export const int53 = () => {
	const codec: Codec<number> = {
		read(reader) {
			const low = reader.view.getUint32(reader.offset, true)
			const high = reader.view.getInt32(reader.offset + 4, true)
			reader.seek(8)

			return low + TWO_PWR_32_DBL * high
		},
		write(writer, value) {
			const bytes = new Uint8Array(8)
			const view = new DataView(bytes.buffer)

			view.setInt32(0, (value % TWO_PWR_32_DBL) | 0, true)

			if (value < 0) {
				view.setInt32(4, (value / TWO_PWR_32_DBL - 1) | 0, true)
			} else {
				view.setInt32(4, (value / TWO_PWR_32_DBL) | 0, true)
			}

			writer.raw(bytes)
		},
	}

	return codec
}
