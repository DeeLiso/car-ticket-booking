import { api } from "@/services/api";
import type {
  AuditLogOut,
  BusCreateInput,
  BookingCreateInput,
  BookingOut,
  BusOut,
  CityOut,
  DashboardResponse,
  OperatorCreateInput,
  OperatorOut,
  OperatorStats,
  OperatorTripManifest,
  OperatorTripRow,
  Page,
  PaymentInitiateResponse,
  RefundOut,
  RouteOut,
  SeatMapResponse,
  TicketOut,
  TokenPair,
  TripSummary,
  UserOut,
  ValidateTicketResponse,
} from "@/types";

/* ---------------------------------- auth --------------------------------- */

export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenPair>("/auth/login", { email, password }).then((r) => r.data),
  register: (payload: { email: string; password: string; full_name: string; phone?: string }) =>
    api.post<TokenPair>("/auth/register", payload).then((r) => r.data),
  me: () => api.get<UserOut>("/auth/me").then((r) => r.data),
  logout: (refreshToken: string) => api.post("/auth/logout", { refresh_token: refreshToken }),
  changePassword: (current_password: string, new_password: string) =>
    api.post("/auth/password/change", { current_password, new_password }).then((r) => r.data),
};

/* --------------------------------- catalog -------------------------------- */

export const catalogApi = {
  cities: () => api.get<CityOut[]>("/cities").then((r) => r.data),
  routes: () => api.get<RouteOut[]>("/routes").then((r) => r.data),
};

/* ---------------------------------- trips --------------------------------- */

export interface TripSearchQuery {
  origin_city_id?: string;
  destination_city_id?: string;
  departure_date?: string;
  passengers?: number;
  page?: number;
  page_size?: number;
  sort?: "price" | "departure" | "duration";
  departure_window?: string;
  bus_type?: string;
}

export const tripsApi = {
  search: (q: TripSearchQuery) =>
    api
      .get<Page<TripSummary>>("/trips/search", { params: { ...q } })
      .then((r) => r.data),
  detail: (id: string) => api.get<TripSummary>(`/trips/${id}`).then((r) => r.data),
  seats: (id: string) => api.get<SeatMapResponse>(`/trips/${id}/seats`).then((r) => r.data),
};

/* --------------------------------- bookings ------------------------------- */

export const bookingsApi = {
  create: (payload: BookingCreateInput) =>
    api.post<BookingOut>("/bookings", payload).then((r) => r.data),
  mine: (page = 1, pageSize = 10) =>
    api.get<Page<BookingOut>>("/bookings", { params: { page, page_size: pageSize } }).then((r) => r.data),
  detail: (id: string) => api.get<BookingOut>(`/bookings/${id}`).then((r) => r.data),
  cancel: (id: string, reason?: string) =>
    api.post<BookingOut>(`/bookings/${id}/cancel`, { reason }).then((r) => r.data),
};

/* --------------------------------- payments ------------------------------- */

export const paymentsApi = {
  initiate: (bookingId: string, method: string) =>
    api.post<PaymentInitiateResponse>("/payments/initiate", { booking_id: bookingId, method }).then((r) => r.data),
  mockConfirm: (transaction_ref: string, confirm_token: string, succeed = true) =>
    api
      .post<PaymentInitiateResponse>("/payments/mock/confirm", {
        transaction_ref,
        confirm_token,
        succeed,
      })
      .then((r) => r.data),
};

/* --------------------------------- tickets -------------------------------- */

export const ticketsApi = {
  lookup: (query: Record<string, string>) =>
    api.get<TicketOut>("/tickets/lookup", { params: query }).then((r) => r.data),
  detail: (id: string) => api.get<TicketOut>(`/tickets/${id}`).then((r) => r.data),
  validate: (token: string, tripId?: string) =>
    api.post<ValidateTicketResponse>("/tickets/validate", { token, trip_id: tripId ?? undefined }).then((r) => r.data),
  qrUrl: (id: string) => `${API_ROOT}/tickets/${id}/qr`,
  pdfUrl: (id: string) => `${API_ROOT}/tickets/${id}/pdf`,
};

const API_ROOT = (import.meta as { env: Record<string, string> }).env?.VITE_API_BASE ?? "/api/v1";

/* ---------------------------------- admin --------------------------------- */

export const adminApi = {
  dashboard: () => api.get<DashboardResponse>("/admin/dashboard").then((r) => r.data),
  operators: () => api.get<OperatorOut[]>("/admin/operators").then((r) => r.data),
  createOperator: (payload: OperatorCreateInput) =>
    api.post<OperatorOut>("/admin/operators", payload).then((r) => r.data),
  routes: () => api.get<RouteOut[]>("/admin/routes").then((r) => r.data),
  createRoute: (payload: { origin_city_id: string; destination_city_id: string; duration_minutes: number }) =>
    api.post<RouteOut>("/admin/routes", payload).then((r) => r.data),
  buses: (page = 1, pageSize = 20) =>
    api.get<Page<BusOut>>("/admin/buses", { params: { page, page_size: pageSize } }).then((r) => r.data),
  createBus: (payload: BusCreateInput) => api.post<BusOut>("/admin/buses", payload).then((r) => r.data),
  trips: (params?: Record<string, unknown>) =>
    api.get<Page<TripSummary>>("/admin/trips", { params }).then((r) => r.data),
  createTrip: (payload: {
    route_id: string;
    bus_id: string;
    departure_at: string;
    arrival_at: string;
    base_price: number;
  }) => api.post<TripSummary>("/admin/trips", payload).then((r) => r.data),
  refunds: () => api.get<RefundOut[]>("/admin/refunds").then((r) => r.data),
  approveRefund: (id: string) => api.post<RefundOut>(`/admin/refunds/${id}/approve`).then((r) => r.data),
  rejectRefund: (id: string) => api.post<RefundOut>(`/admin/refunds/${id}/reject`).then((r) => r.data),
  processRefund: (id: string) => api.post<RefundOut>(`/admin/refunds/${id}/process`).then((r) => r.data),
  auditLogs: () => api.get<AuditLogOut[]>("/admin/audit-logs").then((r) => r.data),
};

/* --------------------------------- operator ------------------------------- */

export const operatorApi = {
  stats: () => api.get<OperatorStats>("/operator/stats").then((r) => r.data),
  buses: () => api.get<BusOut[]>("/operator/buses").then((r) => r.data),
  trips: () => api.get<OperatorTripRow[]>("/operator/trips").then((r) => r.data),
  manifest: (tripId: string) => api.get<OperatorTripManifest>(`/operator/trips/${tripId}/manifest`).then((r) => r.data),
};