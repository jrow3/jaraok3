import type { LayoutServerLoad } from './$types';
import { readFeatures } from '$lib/server/features';

// Every page learns which setup-specific parts are switched on, so it never shows a control
// for hardware or a service this install doesn't have.
export const load: LayoutServerLoad = () => ({ features: readFeatures() });
