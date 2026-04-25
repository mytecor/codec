import { Codec } from '../codec.js'
import { createViewBytes } from './view.js'

export const int32 = (): Codec<number> => {
	return {
		read(reader) {
			const value = reader.view.getInt32(reader.offset, true)
			reader.seek(4)
			return value
		},

		write(writer, value) {
			const { bytes, view } = createViewBytes(4)
			view.setInt32(0, value, true)
			writer.raw(bytes)
		},
	}
}
