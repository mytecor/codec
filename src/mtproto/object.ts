import { Codec } from '../codec.js'

export const object = <T extends Record<string, unknown>>(
	shape: { [K in keyof T]: Codec<T[K]> },
): Codec<T> => {
	return {
		read(reader) {
			const parsed = {} as T

			for (const key in shape) {
				parsed[key] = shape[key].read(reader)
			}

			return parsed
		},

		write(writer, value) {
			for (const key in shape) {
				shape[key].write(writer, value[key])
			}
		},
	}
}
