import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from './controls';
import { toPipewire } from './pipewire';

// "<node>:<port>" for every control the conf declares, read from the file the server runs.
function confPorts(): Set<string> {
	const conf = readFileSync('deploy/audio/mic-fx.conf.template', 'utf8');
	const ports = new Set<string>();
	for (const block of conf.split('{ type =').slice(1)) {
		const name = block.match(/name = (\w+)/)?.[1];
		const controls = block.match(/control = \{([^}]*)\}/)?.[1] ?? '';
		for (const [, port] of controls.matchAll(/"([^"]+)"\s*=/g)) ports.add(`${name}:${port}`);
	}
	return ports;
}

describe('toPipewire', () => {
	it('only names ports that exist in mic-fx.conf.template', () => {
		const ports = confPorts();
		const unknown = Object.keys(toPipewire(DEFAULT_PARAMS).filter).filter((key) => !ports.has(key));
		expect(unknown).toEqual([]);
	});

	it('reproduces the hand-tuned conf at the default settings', () => {
		const { filter, sinkVolume } = toPipewire(DEFAULT_PARAMS);
		expect(filter['mix:Gain 1']).toBe(1);
		expect(filter['comp:Threshold level (dB)']).toBe(-24);
		expect(filter['verb:Tail level (dB)']).toBe(-15);
		expect(filter['voice:Gain 2']).toBe(0);
		expect(sinkVolume).toBe(1);
	});

	it('mutes both inputs without touching the trims', () => {
		const { filter } = toPipewire({ ...DEFAULT_PARAMS, isVoiceMuted: 1, trimLeft: 6 });
		expect(filter['mix:Gain 1']).toBe(0);
		expect(filter['mix:Gain 2']).toBe(0);
	});

	it('turns dB into linear gain and rides the echo on the voice level', () => {
		const { filter } = toPipewire({ ...DEFAULT_PARAMS, trimLeft: -6, voiceLevel: -6, echoLevel: -6 });
		expect(filter['mix:Gain 1']).toBeCloseTo(0.5012, 4);
		expect(filter['voice:Gain 2']).toBeCloseTo(0.2512, 4);
	});
});
