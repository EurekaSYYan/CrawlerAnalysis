"""Shared cleaning helpers for housing data.

The public listing pages rarely provide perfectly structured values, so every
field goes through one explicit parse step before it is written to MySQL.
"""

import re

import pandas as pd


def parse_price_total(value):
    """Parse '780万' / '320万元' / '7,800,000' into a float."""
    if value is None:
        return None
    text = str(value).replace(",", "").strip()
    match = re.search(r"([\d.]+)\s*万", text)
    if match:
        return float(match.group(1)) * 10_000
    match = re.search(r"([\d.]+)\s*亿", text)
    if match:
        return float(match.group(1)) * 100_000_000
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    return float(match.group()) if match else None


def parse_price_per_sqm(value):
    """Parse '68000元/平' / '6.8万/平米' into a float."""
    if value is None:
        return None
    text = str(value).replace(",", "").strip()
    match = re.search(r"([\d.]+)\s*万", text)
    if match:
        return float(match.group(1)) * 10_000
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    return float(match.group()) if match else None


def parse_area(value):
    """Parse '89.4平米' / '89.4平' into a float."""
    if value is None:
        return None
    match = re.search(r"(\d+(?:\.\d+)?)", str(value))
    return float(match.group(1)) if match else None


def parse_room_plan(value):
    """Parse '3室2厅1卫' into (rooms, halls, bathrooms)."""
    if not value:
        return None, None, None
    rooms = _first_number(value, "室")
    halls = _first_number(value, "厅")
    bathrooms = _first_number(value, "卫")
    return rooms, halls, bathrooms


def _first_number(text, unit):
    match = re.search(rf"(\d+)\s*{unit}", text)
    return int(match.group(1)) if match else None


def clean_orientation(value):
    if value is None:
        return None
    normalized = re.sub(r"\s+", "", str(value))
    return normalized if normalized else None


def flag_price_outliers(series, multiplier=1.5):
    """Return a boolean Series marking IQR-based price outliers."""
    numeric = pd.to_numeric(series, errors="coerce")
    q1 = numeric.quantile(0.25)
    q3 = numeric.quantile(0.75)
    iqr = q3 - q1
    if pd.isna(iqr) or iqr == 0:
        return pd.Series(False, index=series.index)
    lower = q1 - multiplier * iqr
    upper = q3 + multiplier * iqr
    return (numeric < lower) | (numeric > upper)


def clean_housing_frame(frame):
    """Apply the standard cleaning pipeline to a raw DataFrame."""
    cleaned = frame.copy()
    if "price_total" in cleaned.columns:
        cleaned["price_total"] = cleaned["price_total"].map(parse_price_total)
    if "price_per_sqm" in cleaned.columns:
        cleaned["price_per_sqm"] = cleaned["price_per_sqm"].map(
            parse_price_per_sqm
        )
    if "area" in cleaned.columns:
        cleaned["area"] = cleaned["area"].map(parse_area)
    if "room_plan" in cleaned.columns:
        parsed = cleaned["room_plan"].map(parse_room_plan)
        cleaned["rooms"] = parsed.str[0]
        cleaned["halls"] = parsed.str[1]
        cleaned["bathrooms"] = parsed.str[2]
    if "orientation" in cleaned.columns:
        cleaned["orientation"] = cleaned["orientation"].map(clean_orientation)

    if {"price_total", "area"}.issubset(cleaned.columns):
        cleaned["price_per_sqm_fallback"] = (
            cleaned["price_total"] / cleaned["area"]
        )
        cleaned.loc[
            cleaned["price_per_sqm"].isna(), "price_per_sqm"
        ] = cleaned.loc[
            cleaned["price_per_sqm"].isna(), "price_per_sqm_fallback"
        ]

    if "price_total" in cleaned.columns:
        outliers = flag_price_outliers(cleaned["price_total"])
        cleaned = cleaned.loc[~outliers.fillna(False)]
    return cleaned.drop(columns=["price_per_sqm_fallback"], errors="ignore")
