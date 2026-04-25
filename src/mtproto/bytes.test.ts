import test from 'node:test'
import assert from 'node:assert/strict'
import { Reader } from '../reader.js'
import { Writer } from '../writer.js'
import { bytes } from './bytes.js'

const codec = bytes()

const encode = (value: Uint8Array): Uint8Array => {
	const writer = new Writer()
	codec.write(writer, value)
	return new Uint8Array(writer.finish())
}

const decode = (value: Uint8Array): Uint8Array => {
	return codec.read(new Reader(value))
}

const createBytes = (length: number): Uint8Array => {
	return Uint8Array.from({ length }, (_, index) => index % 256)
}

test('bytes round-trips short and long forms around the boundary', () => {
	for (const length of [0, 1, 253, 254, 255, 256, 257]) {
		const source = createBytes(length)
		const encoded = encode(source)
		const decoded = decode(encoded)

		assert.deepEqual(decoded, source)
	}
})

test('bytes uses 1-byte header for short values', () => {
	const encoded = encode(createBytes(253))

	assert.equal(encoded[0], 253)
	assert.equal(encoded.byteLength, 256)
	assert.deepEqual(encoded.subarray(1, 254), createBytes(253))
	assert.deepEqual(encoded.subarray(254), new Uint8Array(2))
})

test('bytes uses marker and 24-bit little-endian length for long values', () => {
	const encoded = encode(createBytes(254))

	assert.deepEqual(encoded.subarray(0, 4), Uint8Array.of(254, 254, 0, 0))
	assert.equal(encoded.byteLength, 260)
	assert.deepEqual(encoded.subarray(4, 258), createBytes(254))
	assert.deepEqual(encoded.subarray(258), new Uint8Array(2))
})

test('bytes aligns encoded payloads to 4-byte boundaries', () => {
	for (const length of [0, 1, 2, 3, 4, 5, 253, 254, 255]) {
		assert.equal(encode(createBytes(length)).byteLength % 4, 0)
	}
})

test('bytes rejects payloads larger than the 24-bit MTProto limit', () => {
	const oversized = new Uint8Array(0x1000000)

	assert.throws(
		() => encode(oversized),
		/MTProto bytes length exceeds 24-bit limit/,
	)
})
