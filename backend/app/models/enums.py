from __future__ import annotations

import enum


class StrEnum(str, enum.Enum):
    """String enum usable directly as a SQLAlchemy / Pydantic value."""

    def __str__(self) -> str:  # pragma: no cover
        return self.value


class UserRole(StrEnum):
    PASSENGER = "PASSENGER"
    BUS_OPERATOR = "BUS_OPERATOR"
    ADMIN = "ADMIN"


class UserStatus(StrEnum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    DELETED = "DELETED"


class SeatCategory(StrEnum):
    ORDINARY = "ORDINARY"
    VIP = "VIP"
    SLEEPER = "SLEEPER"


class BusType(StrEnum):
    AC_SEATER = "AC_SEATER"
    NON_AC_SEATER = "NON_AC_SEATER"
    AC_SLEEPER = "AC_SLEEPER"
    NON_AC_SLEEPER = "NON_AC_SLEEPER"
    MINIBUS = "MINIBUS"
    LUXURY = "LUXURY"


class BusLayout(StrEnum):
    LAYOUT_2_2 = "2+2"
    LAYOUT_2_1 = "2+1"
    LAYOUT_3_2 = "3+2"


class TripStatus(StrEnum):
    SCHEDULED = "SCHEDULED"
    BOARDING = "BOARDING"
    DEPARTED = "DEPARTED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class InventoryStatus(StrEnum):
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    SOLD = "SOLD"
    BLOCKED = "BLOCKED"


class BookingStatus(StrEnum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    REFUND_PENDING = "REFUND_PENDING"
    REFUNDED = "REFUNDED"


class PaymentStatus(StrEnum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    REFUND_PENDING = "REFUND_PENDING"
    REFUNDED = "REFUNDED"


class PaymentMethod(StrEnum):
    KBZPAY = "KBZPAY"
    WAVEPAY = "WAVEPAY"
    CBPAY = "CBPAY"
    MMPAY = "MMPAY"
    BANK_TRANSFER = "BANK_TRANSFER"
    MOCK = "MOCK"


class RefundStatus(StrEnum):
    REQUESTED = "REQUESTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PROCESSED = "PROCESSED"


class TicketStatus(StrEnum):
    ACTIVE = "ACTIVE"
    USED = "USED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class ValidationOutcome(StrEnum):
    VALID = "VALID"
    ALREADY_USED = "ALREADY_USED"
    NOT_FOUND = "NOT_FOUND"
    NOT_CONFIRMED = "NOT_CONFIRMED"
    CANCELLED = "CANCELLED"
    WRONG_TRIP = "WRONG_TRIP"
    PAYMENT_INVALID = "PAYMENT_INVALID"


class NotificationType(StrEnum):
    BOOKING = "BOOKING"
    PAYMENT = "PAYMENT"
    TRIP = "TRIP"
    SYSTEM = "SYSTEM"
