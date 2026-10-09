from __future__ import annotations

import math
import string
from typing import List, TypedDict

from app.models.enums import BusLayout, SeatCategory

# Columns per row and the aisle position (aisle is placed *after* this column).
LAYOUT_CONFIG: dict[str, tuple[int, int]] = {
    BusLayout.LAYOUT_2_2.value: (4, 2),
    BusLayout.LAYOUT_2_1.value: (3, 2),
    BusLayout.LAYOUT_3_2.value: (5, 3),
}


class SeatSpec(TypedDict):
    seat_number: str
    row_index: int
    col_index: int
    category: str
    price_multiplier: float
    is_accessible: bool


def layout_columns(layout: str) -> tuple[int, int]:
    cols, aisle = LAYOUT_CONFIG.get(layout, (4, 2))
    return cols, aisle


def generate_layout(
    layout: str,
    capacity: int,
    vip_rows: int = 0,
    vip_multiplier: float = 1.5,
) -> List[SeatSpec]:
    """Build a deterministic seat map from a layout descriptor.

    ``2+2`` -> 4 seats/row (aisle after column 2), ``2+1`` -> 3 seats/row,
    ``3+2`` -> 5 seats/row. VIP rows are the first ``vip_rows`` rows.
    """
    cols, _ = layout_columns(layout)
    rows = math.ceil(capacity / cols)
    specs: List[SeatSpec] = []
    remaining = capacity
    for row in range(1, rows + 1):
        for col in range(1, cols + 1):
            if remaining <= 0:
                break
            letter = string.ascii_uppercase[col - 1]
            specs.append(
                SeatSpec(
                    seat_number=f"{row}{letter}",
                    row_index=row,
                    col_index=col,
                    category=SeatCategory.VIP.value if row <= vip_rows else SeatCategory.ORDINARY.value,
                    price_multiplier=vip_multiplier if row <= vip_rows else 1.0,
                    is_accessible=(row == rows and col == cols),
                )
            )
            remaining -= 1
    return specs
