"""
Philips Hue API v2 client.

Two legitimate importers, by design:
  - app_agents/personas/huey.py -- Huey's own direct, ungated control.
    This is his lane, wired straight to his agent object.
  - app_agents/runtime/adapters/hue.py -- the governed path for every
    other caller (other personas, external systems via
    hue_mcp_server.py), gated behind an approved execution envelope.

No other file should import this module. If you're adding a third
importer, stop -- it almost certainly belongs behind the adapter, not
here.

Setup:
- Bridge must already be paired (press the physical button once, then
  generate an application key per Philips' local pairing flow).
- Set HUE_BRIDGE_IP and HUE_APP_KEY in your .env.

The bridge uses a self-signed local cert, so TLS verification is
disabled for local requests (standard for local Hue API v2 usage).
"""

import os
import httpx

HUE_BRIDGE_IP = os.getenv("HUE_BRIDGE_IP")
HUE_APP_KEY = os.getenv("HUE_APP_KEY")

_BASE_URL = f"https://{HUE_BRIDGE_IP}/clip/v2/resource"


def _headers():
    if not HUE_BRIDGE_IP or not HUE_APP_KEY:
        raise RuntimeError(
            "HUE_BRIDGE_IP and HUE_APP_KEY must be set in .env to reach the bridge (used by Huey directly, and by HueAdapter on everyone else's behalf)."
        )
    return {"hue-application-key": HUE_APP_KEY}


def list_lights() -> dict:
    """Return all lights currently known to the bridge, with current state."""
    resp = httpx.get(f"{_BASE_URL}/light", headers=_headers(), verify=False, timeout=10)
    resp.raise_for_status()
    return resp.json()


def list_scenes() -> dict:
    """Return all scenes currently configured on the bridge."""
    resp = httpx.get(f"{_BASE_URL}/scene", headers=_headers(), verify=False, timeout=10)
    resp.raise_for_status()
    return resp.json()


def set_light_state(
    light_id: str,
    on: bool | None = None,
    brightness: float | None = None,
    color_temp_mirek: int | None = None,
    xy: tuple[float, float] | None = None,
) -> dict:
    """
    Update a single light. Only include the fields you're changing.

    - brightness: 0-100
    - color_temp_mirek: mirek scale (roughly 153=coolest, 500=warmest)
    - xy: CIE xy color coordinates, if setting a specific color rather
      than white-tunable temperature
    """
    payload: dict = {}
    if on is not None:
        payload["on"] = {"on": on}
    if brightness is not None:
        payload["dimming"] = {"brightness": brightness}
    if color_temp_mirek is not None:
        payload["color_temperature"] = {"mirek": color_temp_mirek}
    if xy is not None:
        payload["color"] = {"xy": {"x": xy[0], "y": xy[1]}}

    resp = httpx.put(
        f"{_BASE_URL}/light/{light_id}",
        headers=_headers(),
        json=payload,
        verify=False,
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def apply_scene(scene_id: str) -> dict:
    """Activate a pre-configured scene by id."""
    resp = httpx.put(
        f"{_BASE_URL}/scene/{scene_id}",
        headers=_headers(),
        json={"recall": {"action": "active"}},
        verify=False,
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()
