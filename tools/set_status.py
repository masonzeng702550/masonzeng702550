#!/usr/bin/env python3
"""Rotate GitHub profile status from a random inspiration pool.

Requires env var STATUS_TOKEN — a PAT with the `user` scope.
"""
from __future__ import annotations

import json
import os
import random
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

POOL: list[tuple[str, str]] = [
    (":coffee:", "caffeinating"),
    (":dart:", "deep work mode"),
    (":brain:", "thinking hard"),
    (":crescent_moon:", "hacking at night"),
    (":small_airplane:", "chasing clouds"),
    (":fire:", "shipping something"),
    (":bug:", "hunting bugs"),
    (":headphones:", "lo-fi & code"),
    (":bullettrain_side:", "関西の電車旅"),
    (":ramen:", "ramen break"),
    (":zap:", "refactoring"),
    (":books:", "reading docs"),
    (":test_tube:", "running experiments"),
    (":robot:", "talking to LLMs"),
    (":hammer_and_wrench:", "building things"),
    (":japan:", "関西散歩"),
    (":lock:", "doing security stuff"),
    (":rocket:", "launching something"),
    (":zzz:", "needed coffee 2 hours ago"),
    (":jigsaw:", "puzzling through it"),
    (":triangular_flag_on_post:", "playing CTF"),
    (":satellite:", "tuning ESP32"),
    (":electric_plug:", "soldering"),
    (":mag:", "reading CVE feeds"),
    (":notebook:", "taking notes"),
    (":computer:", "in the zone"),
    (":telescope:", "researching"),
    (":sparkles:", "polishing edges"),
    (":seedling:", "sketching new ideas"),
    (":cherry_blossom:", "mentally in Osaka"),
    (":airplane_departure:", "studying for PPL"),
    (":radio:", "listening to ATC"),
    (":pencil2:", "writing CTF challenges"),
    (":speech_balloon:", "rubber-ducking"),
    (":milky_way:", "drifting through code"),
    (":fox_face:", "being suspiciously clever"),
    (":mountain:", "climbing a yak"),
    (":snowflake:", "freezing this scope"),
]

GRAPHQL = "https://api.github.com/graphql"
MUTATION = """
mutation($input: ChangeUserStatusInput!) {
  changeUserStatus(input: $input) {
    status { message emoji expiresAt }
  }
}
"""


def main() -> int:
    token = os.environ.get("STATUS_TOKEN")
    if not token:
        print("STATUS_TOKEN env var missing", file=sys.stderr)
        return 1

    emoji, message = random.choice(POOL)
    expires = (datetime.now(timezone.utc) + timedelta(minutes=65)).isoformat()

    payload = json.dumps({
        "query": MUTATION,
        "variables": {
            "input": {
                "emoji": emoji,
                "message": message,
                "expiresAt": expires,
                "limitedAvailability": False,
            }
        },
    }).encode()

    req = urllib.request.Request(
        GRAPHQL,
        data=payload,
        headers={
            "Authorization": f"bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "masonzeng702550-status-bot",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        return 1

    if body.get("errors"):
        print(json.dumps(body["errors"], indent=2), file=sys.stderr)
        return 1

    result = body["data"]["changeUserStatus"]["status"]
    print(f"set status -> {result['emoji']} {result['message']} (expires {result['expiresAt']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
