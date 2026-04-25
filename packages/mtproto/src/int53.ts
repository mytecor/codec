import { Codec } from '@mytecor/codec'
import { createViewBytes } from './view.js'

const TWO_PWR_32_DBL = 2 ** 32

export const int53 = (): Codec<number> => {
	return {
		read(reader) {
			const low = reader.view.getUint32(reader.offset, true)
			const high = reader.view.getInt32(reader.offset + 4, true)
			reader.seek(8)

			return low + TWO_PWR_32_DBL * high
		},

		write(writer, value) {
			const { bytes, view } = createViewBytes(8)

			view.setInt32(0, (value % TWO_PWR_32_DBL) | 0, true)

			if (value < 0) {
				view.setInt32(4, (value / TWO_PWR_32_DBL - 1) | 0, true)
			} else {
				view.setInt32(4, (value / TWO_PWR_32_DBL) | 0, true)
			}

			writer.raw(bytes)
		},
	}
}
