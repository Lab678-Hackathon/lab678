"""지명 감지(domain/locations.detect_location_in_text) 유닛테스트 — 결정론."""

from __future__ import annotations

import pytest

from app.domain.locations import (
    _DEFAULT,
    detect_location_in_text,
    resolve_start_coords,
)
from app.models.recommend import StartLocation


def test_detects_known_landmark_in_free_text():
    loc = detect_location_in_text("Plan a route, I am at Myeongdong please")
    assert loc is not None
    assert abs(loc.lat - 37.5637) < 0.01 and abs(loc.lng - 126.9850) < 0.01


def test_case_insensitive():
    assert detect_location_in_text("i'm near GYEONGBOKGUNG now") is not None


def test_unknown_location_returns_none():
    # 테이블에 없는 지명은 좌표를 지어내지 않고 None(앱 컨텍스트로 폴백).
    assert detect_location_in_text("I am at some random alley in Busan") is None


def test_empty_returns_none():
    assert detect_location_in_text(None) is None
    assert detect_location_in_text("") is None


# ── 프론트 'Start from' 시트 프리셋과 백엔드 가젯티어 일치 (A·B 위치 매칭 일관성) ──
# 과거엔 Bukchon·Jonggak·Jongmyo·Namsangol 이 백엔드 표에 없어 라벨/프롬프트만으로 들어오면
# 종각 디폴트로 빠졌다(추천 B). 시트 프리셋 전부가 좌표 없이도 해석돼야 한다.
_PRESET_LABELS = [
    ("Gyeongbokgung Palace", (37.5796, 126.9770)),
    ("Gwanghwamun Square", (37.5724, 126.9769)),
    ("Anguk · Insadong", (37.5742, 126.9858)),
    ("Bukchon Hanok Village", (37.5826, 126.9850)),
    ("Jonggak", (37.5703, 126.9830)),
    ("Jongmyo Shrine", (37.5745, 126.9941)),
    ("City Hall", (37.5663, 126.9779)),
    ("Deoksugung", (37.5658, 126.9751)),
    ("Myeongdong", (37.5637, 126.9850)),
    ("Namsangol Hanok Village", (37.5593, 126.9942)),
    ("Dongdaemun · DDP", (37.5663, 127.0090)),
]


@pytest.mark.parametrize("label,coords", _PRESET_LABELS)
def test_preset_label_resolves_without_coords(label, coords):
    # 좌표 없이 라벨만으로도 프리셋이 정확히 해석돼야 한다(디폴트로 빠지지 않음).
    got = resolve_start_coords(StartLocation(label=label))
    assert got != _DEFAULT, f"{label} fell back to default"
    assert abs(got[0] - coords[0]) < 0.01 and abs(got[1] - coords[1]) < 0.01


@pytest.mark.parametrize("label,_coords", _PRESET_LABELS)
def test_preset_detected_in_free_text(label, _coords):
    # 챗 프롬프트에 지명을 적어도 감지돼야 한다(A·B 일관).
    assert detect_location_in_text(f"Plan a route from {label} today") is not None


def test_namsangol_not_default():
    # 회귀: "Namsangol" 이 종각 디폴트로 빠지던 버그.
    assert resolve_start_coords(StartLocation(label="Namsangol")) != _DEFAULT
