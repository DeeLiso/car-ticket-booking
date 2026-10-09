from typing import Any


class AppError(Exception):
    """Base application error. Handlers convert it to a consistent JSON payload."""

    status_code = 400
    code = "bad_request"
    message = "Bad request"

    def __init__(self, message: str | None = None, *, detail: Any = None, code: str | None = None):
        self.message = message or self.message
        self.detail = detail
        if code:
            self.code = code
        super().__init__(self.message)


class ValidationError(AppError):
    status_code = 422
    code = "validation_error"
    message = "The submitted data is invalid"


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"
    message = "Resource not found"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"
    message = "The request conflicts with the current state"


class SeatUnavailableError(ConflictError):
    code = "seat_unavailable"
    message = "One or more selected seats are no longer available"


class UnauthorizedError(AppError):
    status_code = 401
    code = "unauthorized"
    message = "Authentication required"


class ForbiddenError(AppError):
    status_code = 403
    code = "forbidden"
    message = "You do not have permission to perform this action"


class RateLimitError(AppError):
    status_code = 429
    code = "rate_limited"
    message = "Too many requests, please try again later"


class PaymentError(AppError):
    status_code = 400
    code = "payment_error"
    message = "Payment could not be processed"


class PreconditionFailed(AppError):
    status_code = 412
    code = "precondition_failed"
    message = "Precondition failed"
