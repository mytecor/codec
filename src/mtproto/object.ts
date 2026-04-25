import { Codec } from '../codec.js'

export const object = <T extends Record<string, unknown>>(
	shape: { [K in keyof T]: Codec<T[K]> },
): Codec<T> => {
	const keys = Object.keys(shape) as Array<keyof T>

	return {
		read(reader) {
			const parsed = {} as T

			for (const key of keys) {
				parsed[key] = shape[key].read(reader)
			}

			return parsed
		},

		write(writer, value) {
			for (const key of keys) {
				shape[key].write(writer, value[key])
			}
		},
	}
}
