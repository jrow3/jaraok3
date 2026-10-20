// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			/** From the root layout: what this install has switched on. */
			features: import('$lib/types').Features;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
