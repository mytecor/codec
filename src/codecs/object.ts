import { Codec } from '../codec.js'

export const object = <T extends Record<string, unknown>>(
	shape: { [K in keyof T]: Codec<T[K]> },
) => {
	const codec: Codec<T> = (value) => {
		return value
	}

	codec.read = (reader) => {
		const parsed = {} as T

		for (const key in shape) {
			parsed[key] = shape[key].read(reader)
		}

		return parsed
	}

	codec.write = (writer, value) => {
		for (const key in shape) {
			shape[key].write(writer, value[key])
		}
	}

	return codec
}
