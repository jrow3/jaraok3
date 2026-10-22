import type { SystemState } from '../../types';

export type PowerLook = 'unknown' | 'off' | 'starting' | 'on' | 'confirming';

export const POWER_LABEL: Record<PowerLook, string> = {
	unknown: 'System',
	off: 'System off',
	starting: 'Starting\u2026',
	on: 'System on',
	confirming: 'Turn off?'
};

// What the host asked for is not enough: the TV counts as on only once its screen
// has connected.
export function powerLook(system: SystemState | null, isConfirmingOff: boolean): PowerLook {
	if (!system) return 'unknown';
	if (isConfirmingOff) return 'confirming';
	if (!system.isOn) return 'off';
	return system.isTvConnected ? 'on' : 'starting';
}
