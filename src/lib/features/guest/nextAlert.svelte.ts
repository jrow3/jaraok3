import type { MySong } from './mySongs';
import { checkNext, NEXT_VIBRATION_MS } from './nextAlert';
import { fetchPartySettings } from './partySettings';

const PHONE_SWITCH_KEY = 'karaoke:vibrate';

// The buzz needs both switches on: the host's, for the whole party, and this phone's own.
export function createNextAlert() {
	let canVibrate = $state(false);
	let isHostOn = $state(false);
	let isPhoneOn = $state(true);
	let buzzedIds: ReadonlySet<string> | undefined;

	async function readHostSwitch() {
		isHostOn = (await fetchPartySettings()).isVibrationOn;
	}

	async function load() {
		// iPhone Safari has no vibration API, so the phone switch stays hidden there.
		canVibrate = 'vibrate' in navigator;
		isPhoneOn = localStorage.getItem(PHONE_SWITCH_KEY) !== 'off';
		await readHostSwitch();
	}

	async function check(songs: MySong[]) {
		const result = checkNext(buzzedIds, songs);
		buzzedIds = result.buzzedIds;
		if (!result.shouldBuzz || !canVibrate || !isPhoneOn) return;
		// Asked again now: the host may have switched it off since this page opened.
		await readHostSwitch();
		if (isHostOn) navigator.vibrate(NEXT_VIBRATION_MS);
	}

	function setPhoneOn(isOn: boolean) {
		isPhoneOn = isOn;
		localStorage.setItem(PHONE_SWITCH_KEY, isOn ? 'on' : 'off');
	}

	return {
		get isSwitchShown() {
			return canVibrate && isHostOn;
		},
		get isPhoneOn() {
			return isPhoneOn;
		},
		load,
		check,
		setPhoneOn
	};
}
