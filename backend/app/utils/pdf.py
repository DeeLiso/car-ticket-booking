from __future__ import annotations

import io
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from app.utils.qr import make_qr_png
from app.utils.timeutil import to_app_tz

BRAND = colors.HexColor("#1e3a8a")
ACCENT = colors.HexColor("#10b981")


def _row(c: canvas.Canvas, y: float, label: str, value: str) -> float:
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#64748b"))
    c.drawString(24 * mm, y, label.upper())
    c.setFont("Helvetica", 12)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(24 * mm, y - 5 * mm, value)
    return y - 13 * mm


def build_ticket_pdf(*, booking, ticket, qr_payload: str, trip_info) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    c.setFillColor(BRAND)
    c.rect(0, height - 30 * mm, width, 30 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(24 * mm, height - 20 * mm, "Car Ticket Booking")
    c.setFont("Helvetica", 10)
    c.drawRightString(width - 24 * mm, height - 20 * mm, f"Ticket {ticket.ticket_number}")

    y = height - 45 * mm
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(24 * mm, y, f"{trip_info.origin}  ->  {trip_info.destination}")
    y -= 4 * mm
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.line(24 * mm, y, width - 24 * mm, y)
    y -= 12 * mm

    dep = to_app_tz(trip_info.departure_at)
    y = _row(c, y, "Booking reference", booking.reference)
    y = _row(c, y, "Passengers", ", ".join(p.full_name for p in booking.passengers))
    y = _row(c, y, "Seats", ", ".join(s.seat_number for s in booking.seats))
    y = _row(c, y, "Departure", dep.strftime("%a, %d %b %Y  %H:%M"))
    y = _row(c, y, "Operator", trip_info.operator)
    y = _row(c, y, "Bus", f"{trip_info.bus_name} ({trip_info.bus_registration})")
    y = _row(c, y, "Payment", "PAID" if booking.status == "CONFIRMED" else booking.status)
    y = _row(c, y, "Total paid", f"{float(booking.total_amount):,.0f} {booking.currency}")

    qr_img = ImageReader(io.BytesIO(make_qr_png(qr_payload, box_size=6)))
    c.drawImage(qr_img, width - 70 * mm, y - 32 * mm, 46 * mm, 46 * mm)
    c.setFont("Helvetica", 7)
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.drawString(width - 70 * mm, y - 36 * mm, "Scan at boarding (single use)")

    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.drawString(24 * mm, 20 * mm, "Present this ticket with a photo ID. Tickets are non-transferable.")
    c.showPage()
    c.save()
    return buffer.getvalue()
