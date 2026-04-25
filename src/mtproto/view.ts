export const createViewBytes = (
	length: number,
): { bytes: Uint8Array; view: DataView } => {
	const bytes = new Uint8Array(length)
	const view = new DataView(bytes.buffer)

	return { bytes, view }
}
