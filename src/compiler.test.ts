import assert from 'node:assert/strict'
import test from 'node:test'
import { branch, Codec, codecId, codecNode, sequence } from './codec.js'
import { Compiler } from './compiler.js'
import { id } from './mtproto/id.js'
import { object } from './mtproto/object.js'
import { string } from './mtproto/string.js'
import { uint32 } from './mtproto/uint32.js'
import { union } from './mtproto/union.js'
import { vector } from './mtproto/vector.js'
import { Writer } from './writer.js'
import { Reader } from './reader.js'

test('compiler executes bytecode for objects, vectors, strings, and unions', () => {
	const user = id(
		object({
			id: uint32(),
			name: string(),
			scores: vector(uint32(), true),
		}),
		0x10000001,
	)

	const channel = id(
		object({
			id: uint32(),
			title: string(),
			members: uint32(),
		}),
		0x10000002,
	)

	const schema = union([user, channel] as const)
	const compiler = new Compiler(schema)

	const encodedUser = compiler.write(
		user({
			id: 7,
			name: 'alice',
			scores: [1, 2, 3],
		}),
	)
	const decodedUser = compiler.read(encodedUser)

	assert.equal(decodedUser[codecId], user[codecId])
	assert.deepEqual(decodedUser, { id: 7, name: 'alice', scores: [1, 2, 3] })

	const encodedChannel = compiler.write(
		channel({
			id: 9,
			title: 'news',
			members: 42,
		}),
	)
	const decodedChannel = compiler.read(encodedChannel)

	assert.equal(decodedChannel[codecId], channel[codecId])
	assert.deepEqual(decodedChannel, { id: 9, title: 'news', members: 42 })
})

test('union exposes a generic branch node for compilation', () => {
	const user = id(object({ id: uint32() }), 0x10000001)
	const channel = id(object({ id: uint32() }), 0x10000002)
	const schema = union([user, channel] as const)

	assert.equal(schema[codecNode]?.kind, 'branch')
	assert.deepEqual(
		schema[codecNode]?.branches.map((branch) => branch.key),
		[user[codecId], channel[codecId]],
	)
})

test('compiler falls back to codec.read and codec.write for custom leaves', () => {
	const base = uint32()
	const custom: Codec<number> = {
		read(reader) {
			return base.read(reader) + 1
		},

		write(writer, value) {
			base.write(writer, value - 1)
		},
	}

	const schema = object({ value: custom, count: uint32() })
	const compiler = new Compiler(schema)

	const encoded = compiler.write({ value: 10, count: 3 })
	const decoded = compiler.read(encoded)

	assert.deepEqual(decoded, { value: 10, count: 3 })

	const directWriter = new Writer()
	schema.write(directWriter, { value: 10, count: 3 })

	assert.deepEqual(
		new Uint8Array(encoded),
		new Uint8Array(directWriter.finish()),
	)
	assert.deepEqual(schema.read(new Reader(encoded)), decoded)
})

test('sequence and branch constructors publish generic codec nodes', () => {
	const stepCodec = uint32()
	const selectorCodec = uint32()
	const sequenceCodec = sequence(
		{
			read: () => ({ value: 0 }),
			write: () => {},
		},
		{
			create() {
				return {}
			},
			steps: [
				{
					codec: stepCodec,
					select(value) {
						return (value as { value: number }).value
					},
					assign(target, value) {
						;(target as { value: number }).value = value as number
					},
				},
			],
		},
	)
	const branchCodec = branch(
		{
			read: () => ({ kind: 1 }),
			write: () => {},
		},
		{
			selector: selectorCodec,
			select(value) {
				return (value as { kind: number }).kind
			},
			branches: [{ key: 1, codec: stepCodec }],
		},
	)

	assert.equal(sequenceCodec[codecNode]?.kind, 'sequence')
	assert.equal(sequenceCodec[codecNode]?.steps.length, 1)
	assert.equal(branchCodec[codecNode]?.kind, 'branch')
	assert.deepEqual(
		branchCodec[codecNode]?.branches.map((entry) => entry.key),
		[1],
	)
})
