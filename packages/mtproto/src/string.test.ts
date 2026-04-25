import assert from 'node:assert/strict'
import test from 'node:test'
import { Reader, Writer } from '@mytecor/codec-core'
import { string } from './string.js'

const codec = string()

const encode = (value: string): Uint8Array => {
	const writer = new Writer()
	codec.write(writer, value)
	return new Uint8Array(writer.finish())
}

const decode = (value: Uint8Array): string => {
	return codec.read(new Reader(value))
}

test('string round-trips short and long UTF-8 payloads', () => {
	for (const value of [
		'',
		'a',
		'a'.repeat(253),
		'a'.repeat(254),
		'a'.repeat(255),
		'hello Привет 你好',
	]) {
		assert.equal(decode(encode(value)), value)
	}
})

test('string uses the short bytes form up to 253 UTF-8 bytes', () => {
	const encoded = encode('a'.repeat(253))

	assert.equal(encoded[0], 253)
	assert.equal(encoded.byteLength, 256)
})

test('string switches to the long bytes form at 254 UTF-8 bytes', () => {
	const encoded = encode('a'.repeat(254))

	assert.deepEqual(encoded.subarray(0, 4), Uint8Array.of(254, 254, 0, 0))
	assert.equal(encoded.byteLength, 260)
})

test('string length is based on UTF-8 bytes, not code points', () => {
	const value = '🙂'.repeat(64)
	const encoded = encode(value)

	assert.deepEqual(encoded.subarray(0, 4), Uint8Array.of(254, 0, 1, 0))
	assert.equal(decode(encoded), value)
	assert.equal(encoded.byteLength % 4, 0)
})
