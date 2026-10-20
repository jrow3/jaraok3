declare module 'cdgraphics' {
	export interface CdgFrame {
		imageData: ImageData;
		isChanged: boolean;
		backgroundRGBA: [number, number, number, number];
		contentBounds: [number, number, number, number];
	}
	export default class CDGraphics {
		constructor(buffer: ArrayBuffer);
		render(time: number, options?: { forceKey?: boolean }): CdgFrame;
	}
}
