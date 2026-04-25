import { Codec } from '@mytecor/codec-core'
import { createViewBytes } from './view.js'

export const float = (): Codec<number> => {
	return {
		read(reader) {
			const value = reader.view.getFloat32(reader.offset, true)
			reader.seek(4)
			return value
		},

		write(writer, value) {
			const { bytes, view } = createViewBytes(4)
			view.setFloat32(0, value, true)
			writer.raw(bytes)
		},
	}
}
