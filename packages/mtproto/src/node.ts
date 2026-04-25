import { Codec, TaggedCodec } from '@mytecor/codec'

export const mtprotoNode = Symbol('mtprotoCodecNode')

export type VectorCodecNode = {
	kind: 'vector'
	item: Codec<unknown>
	bare: boolean
}

export type UnionCodecNode = {
	kind: 'union'
	codecs: TaggedCodec<unknown>[]
}

export type TaggedCodecNode = {
	kind: 'tagged'
	id: number
	codec: Codec<unknown>
}

export type MtprotoCodecNode =
	| VectorCodecNode
	| UnionCodecNode
	| TaggedCodecNode

type WithMtprotoNode = {
	[mtprotoNode]?: MtprotoCodecNode
}

export const defineMtprotoCodec = <T extends Codec<unknown>>(
	codec: T,
	node: MtprotoCodecNode,
): T => {
	;(codec as T & WithMtprotoNode)[mtprotoNode] = node
	return codec
}
