import pytest

import render_conf

XFI = {
    "AUDIO_SOURCE": "alsa_input.usb-Creative_Technology_SB_X-Fi_Surround_5.1-00.analog-stereo",
    "AUDIO_SINK": "alsa_output.usb-Creative_Technology_SB_X-Fi_Surround_5.1-00.analog-stereo",
}


def rendered(env):
    # A Windows checkout may hand the template over with CRLF line endings.
    return render_conf.render(render_conf.TEMPLATE.read_text(), env).replace("\r\n", "\n")


def test_two_inputs_read_the_line_in_as_stereo_and_sum_both():
    conf = rendered({**XFI, "MIC_INPUTS": "2"})
    assert 'inputs  = [ "mix:In 1" "mix:In 2" ]' in conf
    assert "audio.channels = 2\n        audio.position = [ FL FR ]\n        node.latency   = 512/48000" in conf
    assert f'target.object  = "{XFI["AUDIO_SOURCE"]}"' in conf
    assert f'target.object  = "{XFI["AUDIO_SINK"]}"' in conf


def test_one_input_reads_the_interface_as_mono():
    conf = rendered({**XFI, "MIC_INPUTS": "1"})
    assert 'inputs  = [ "mix:In 1" ]' in conf
    assert "audio.channels = 1\n        audio.position = [ MONO ]" in conf


def test_fills_every_placeholder_with_defaults_for_the_optional_ones():
    conf = rendered(XFI)
    assert "{{" not in conf
    assert "plugin = /usr/lib/ladspa/gate_1410.so" in conf
    assert 'inputs  = [ "mix:In 1" "mix:In 2" ]' in conf


def test_takes_another_plugin_folder_and_buffer():
    conf = rendered({**XFI, "LADSPA_DIR": "/usr/lib64/ladspa/", "AUDIO_LATENCY": "256/48000"})
    assert "plugin = /usr/lib64/ladspa/sc4m_1916.so" in conf
    assert "node.latency   = 256/48000" in conf


def test_refuses_a_missing_device_or_a_bad_input_count():
    with pytest.raises(ValueError, match="AUDIO_SINK"):
        rendered({"AUDIO_SOURCE": "x"})
    with pytest.raises(ValueError, match="MIC_INPUTS"):
        rendered({**XFI, "MIC_INPUTS": "3"})


def test_reads_an_env_file_with_comments_and_quotes():
    env = render_conf.read_env('# my interface\nAUDIO_SOURCE="alsa_input.x"\n\nAUDIO_SINK=alsa_output.y\nMIC_INPUTS=1\n')
    assert env == {"AUDIO_SOURCE": "alsa_input.x", "AUDIO_SINK": "alsa_output.y", "MIC_INPUTS": "1"}
