import json
import os
import struct

import karaoke_mixer_agent as agent

MIXER = {"params": {}, "apply": {"filter": {"gate:Threshold (dB)": -50, "voice:Gain 2": 0.25}, "sinkVolume": 1.7}}


def dump(node_id):
    return json.dumps([
        {"id": 3, "type": "PipeWire:Interface:Node", "info": {"props": {"node.name": "something_else"}}},
        {"id": node_id, "type": "PipeWire:Interface:Node", "info": {"props": {"node.name": agent.FILTER_NODE}}},
    ])


class FakePipewire:
    def __init__(self):
        self.node_id = 41
        self.calls = []
        self.is_failing = False

    def __call__(self, command):
        if command[0] == "pw-dump":
            return dump(self.node_id)
        if self.is_failing:
            raise agent.subprocess.CalledProcessError(1, command)
        self.calls.append(command)
        return ""


def test_props_arg_is_the_spa_pod_pw_cli_takes():
    assert agent.props_arg({"gate:Threshold (dB)": -50, "mix:Gain 1": 0.5}) == (
        '{ params = [ "gate:Threshold (dB)" -50 "mix:Gain 1" 0.5 ] }'
    )


def test_finds_the_filter_node_by_name():
    assert agent.find_node_id(json.loads(dump(41)), agent.FILTER_NODE) == 41
    assert agent.find_node_id([], agent.FILTER_NODE) is None


def test_peak_db_per_channel():
    samples = struct.pack("<4f", 0.5, 0.0, -1.0, 0.0)
    left, right = agent.peak_db(samples, 2)
    assert round(left, 3) == 0.0
    assert right == agent.FLOOR_DB


def test_applies_the_file_once_and_caps_the_sink_at_unity(tmp_path):
    path = tmp_path / "mixer.json"
    path.write_text(json.dumps(MIXER))
    pipewire = FakePipewire()
    applier = agent.Applier(pipewire)
    assert applier.check(path, is_node_check_due=True)
    assert not applier.check(path, is_node_check_due=True)
    set_param, set_volume = pipewire.calls
    assert set_param[:4] == ["pw-cli", "set-param", "41", "Props"]
    assert set_volume == ["wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", "1.00"]


def test_reapplies_when_pipewire_restarts_and_the_node_comes_back(tmp_path):
    path = tmp_path / "mixer.json"
    path.write_text(json.dumps(MIXER))
    pipewire = FakePipewire()
    applier = agent.Applier(pipewire)
    applier.check(path, is_node_check_due=True)
    pipewire.node_id = 57
    assert not applier.check(path, is_node_check_due=False)
    assert applier.check(path, is_node_check_due=True)
    assert pipewire.calls[-2][2] == "57"


def test_a_changed_file_is_applied(tmp_path):
    path = tmp_path / "mixer.json"
    path.write_text(json.dumps(MIXER))
    applier = agent.Applier(FakePipewire())
    applier.check(path, is_node_check_due=True)
    path.write_text(json.dumps(MIXER))
    os.utime(path, ns=(1, 1))
    assert applier.check(path, is_node_check_due=False)


def test_a_failed_apply_waits_for_the_next_node_check(tmp_path):
    path = tmp_path / "mixer.json"
    path.write_text(json.dumps(MIXER))
    pipewire = FakePipewire()
    pipewire.is_failing = True
    applier = agent.Applier(pipewire)
    try:
        applier.check(path, is_node_check_due=True)
    except agent.subprocess.CalledProcessError:
        pass
    pipewire.is_failing = False
    assert not applier.check(path, is_node_check_due=False)
    assert applier.check(path, is_node_check_due=True)


def test_no_file_yet_means_nothing_to_apply(tmp_path):
    assert not agent.Applier(FakePipewire()).check(tmp_path / "mixer.json", is_node_check_due=True)


def test_master_sets_the_interface_output_when_it_is_there(tmp_path, monkeypatch):
    monkeypatch.setattr(agent, "SINK_NODE", "alsa_output.my_interface")
    path = tmp_path / "mixer.json"
    path.write_text(json.dumps(MIXER))
    pipewire = FakePipewire()
    real_dump = dump(41)
    sink = {"id": 77, "type": "PipeWire:Interface:Node", "info": {"props": {"node.name": "alsa_output.my_interface"}}}
    pipewire_with_sink = lambda command: (
        json.dumps([*json.loads(real_dump), sink]) if command[0] == "pw-dump" else pipewire(command)
    )
    agent.Applier(pipewire_with_sink).check(path, is_node_check_due=True)
    assert pipewire.calls[-1] == ["wpctl", "set-volume", "77", "1.00"]


def test_meters_one_summed_input_or_two_separate_ones():
    assert agent.input_levels([-20.0, -12.0], 1) == {"inL": -12.0, "inR": agent.FLOOR_DB}
    assert agent.input_levels([-20.0, -12.0], 2) == {"inL": -20.0, "inR": -12.0}
