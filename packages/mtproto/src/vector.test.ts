import assert from 'node:assert/strict'
import test from 'node:test'
import { Reader, Writer } from '@mytecor/codec-core'
import { uint32 } from './uint32.js'
import { vector } from './vector.js'

const VECTOR_ID = 0x1cb5c415

const encode = (values: number[], bare = false): Uint8Array => {
	const writer = new Writer()
	vector(uint32(), bare).write(writer, values)
	return new Uint8Array(writer.finish())
}

const decode = (value: Uint8Array, bare = false): number[] => {
	return vector(uint32(), bare).read(new Reader(value))
}

test('vector round-trips values with the constructor id', () => {
	const values = [1, 2, 3, 0xffffffff]

	assert.deepEqual(decode(encode(values)), values)
})

test('vector writes constructor id and length in little-endian format', () => {
	const encoded = encode([1, 2, 3])

	assert.deepEqual(
		encoded.subarray(0, 8),
		Uint8Array.of(0x15, 0xc4, 0xb5, 0x1c, 0x03, 0x00, 0x00, 0x00),
	)
	assert.deepEqual(decode(encoded), [1, 2, 3])
})

test('bare vector omits the constructor id', () => {
	const encoded = encode([7, 8], true)

	assert.deepEqual(
		encoded,
		Uint8Array.of(
			0x02,
			0x00,
			0x00,
			0x00,
			0x07,
			0x00,
			0x00,
			0x00,
			0x08,
			0x00,
			0x00,
			0x00,
		),
	)
	assert.deepEqual(decode(encoded, true), [7, 8])
})

test('vector rejects an invalid constructor id', () => {
	const encoded = encode([1])
	encoded[0] ^= 0xff

	assert.throws(
		() => decode(encoded),
		new RegExp(`expected .*${VECTOR_ID.toString(16)}`, 'i'),
	)
})
