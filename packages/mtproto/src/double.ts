import { Codec } from '@mytecor/codec-core'
import { createViewBytes } from './view.js'

export const double = (): Codec<number> => {
	return {
		read(reader) {
			const value = reader.view.getFloat64(reader.offset, true)
			reader.seek(8)
			return value
		},

		write(writer, value) {
			const { bytes, view } = createViewBytes(8)
			view.setFloat64(0, value, true)
			writer.raw(bytes)
		},
	}
}
