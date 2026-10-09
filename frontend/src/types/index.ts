export type Role = "PASSENGER" | "BUS_OPERATOR" | "ADMIN";

export interface UserOut {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: Role;
  status: string;
  created_at: string;
  last_login_at?: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserOut;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface CityOut {
  id: string;
  name: string;
  slug: string;
  region?: string | null;
  country: string;
  is_popular: boolean;
}

export interface RouteOut {
  id: string;
  origin_city_id: string;
  destination_city_id: string;
  origin_city?: CityOut | null;
  destination_city?: CityOut | null;
  distance_km?: number | null;
  duration_minutes: number;
  is_active: boolean;
}

export interface TripOperator {
  id: string;
  company_name: string;
  is_verified: boolean;
}

export interface TripBusInfo {
  id: string;
  name: string;
  registration_number: string;
  bus_type: string;
  layout: string;
  amenities: string[];
}

export interface TripSummary {
  id: string;
  departure_at: string;
  arrival_at: string;
  base_price: number;
  status: string;
  duration_minutes: number;
  route_id: string;
  origin_city?: CityOut | null;
  destination_city?: CityOut | null;
  operator?: TripOperator | null;
  bus?: TripBusInfo | null;
  available_seats: number;
  total_seats: number;
}

export type SeatStatusValue = "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";

export interface SeatStatus {
  seat_id: string;
  seat_number: string;
  row_index: number;
  col_index: number;
  category: "ORDINARY" | "VIP" | "SLEEPER";
  price: number;
  is_accessible: boolean;
  status: SeatStatusValue;
}

export interface SeatMapResponse {
  trip_id: string;
  layout: string;
  rows: number;
  cols: number;
  aisle_after_col: number;
  seats: SeatStatus[];
  available_seats: number;
  base_price: number;
  currency: string;
  hold_expires_at?: string | null;
}

export type BookingStatusValue =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUND_PENDING"
  | "REFUNDED";

export interface BookingSeatOut {
  seat_id: string;
  seat_number: string;
  category: string;
  price: number;
}

export interface BookingPassengerOut {
  seat_number: string;
  full_name: string;
  phone: string;
  email?: string | null;
  id_number?: string | null;
}

export interface BookingTripInfo {
  id: string;
  departure_at: string;
  arrival_at: string;
  origin: string;
  destination: string;
  operator: string;
  bus_name: string;
  bus_registration: string;
}

export interface BookingOut {
  id: string;
  reference: string;
  user_id: string;
  trip_id: string;
  status: BookingStatusValue;
  seat_count: number;
  subtotal: number;
  fees: number;
  total_amount: number;
  currency: string;
  contact_name: string;
  contact_phone: string;
  contact_email?: string | null;
  expires_at?: string | null;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  seats: BookingSeatOut[];
  passengers: BookingPassengerOut[];
  trip?: BookingTripInfo | null;
  has_ticket: boolean;
  ticket_id?: string | null;
}

export interface PassengerInput {
  seat_id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  id_number?: string | null;
}

export interface BookingCreateInput {
  trip_id: string;
  seat_ids: string[];
  passengers: PassengerInput[];
  contact_name: string;
  contact_phone: string;
  contact_email?: string | null;
}

export interface PaymentOut {
  id: string;
  booking_id: string;
  method: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  transaction_ref: string;
  provider_ref?: string | null;
  failure_reason?: string | null;
  initiated_at: string;
  paid_at?: string | null;
  verified_at?: string | null;
}

export interface PaymentInitiateResponse {
  payment: PaymentOut;
  redirect_url?: string | null;
  instructions?: string | null;
  mock_confirm_token?: string | null;
}

export interface TicketOut {
  id: string;
  booking_id: string;
  ticket_number: string;
  status: string;
  issued_at: string;
  used_at?: string | null;
  booking_reference?: string | null;
  passenger_names: string[];
  seat_numbers: string[];
  trip?: BookingTripInfo | null;
  payment_status?: string | null;
}

export interface ValidateTicketResponse {
  outcome: string;
  valid: boolean;
  message: string;
  ticket_number?: string | null;
  booking_reference?: string | null;
  passenger_names: string[];
  seat_numbers: string[];
  trip_id?: string | null;
}

export interface BusOut {
  id: string;
  operator_id: string;
  registration_number: string;
  name: string;
  bus_type: string;
  layout: string;
  seat_capacity: number;
  amenities: string[];
  is_active: boolean;
  created_at: string;
}

export interface BusCreateInput {
  operator_id?: string | null;
  registration_number: string;
  name: string;
  bus_type: string;
  layout: string;
  seat_capacity: number;
  amenities: string[];
  is_active: boolean;
  seat_numbers?: string[] | null;
  vip_rows: number;
}

export interface ManifestPassenger {
  booking_reference: string;
  passenger_name: string;
  phone: string;
  seat_number: string;
}

export interface OperatorTripManifest {
  trip_id: string;
  departure_at: string;
  origin: string;
  destination: string;
  bus_registration: string;
  confirmed_seats: number;
  passengers: ManifestPassenger[];
}

export interface OperatorStats {
  total_buses: number;
  total_trips: number;
  confirmed_bookings: number;
  seats_sold: number;
}

export interface OperatorTripRow {
  id: string;
  route_id: string;
  bus_id: string;
  departure_at: string;
  arrival_at: string;
  base_price: number;
  status: string;
  origin?: string | null;
  destination?: string | null;
  bus?: string | null;
  seats_sold: number;
  total_seats: number;
}

export interface OperatorOut {
  id: string;
  company_name: string;
  license_number?: string | null;
  contact_phone?: string | null;
  is_verified: boolean;
  user_id: string;
  email?: string | null;
  full_name?: string | null;
  buses_count: number;
}

export interface OperatorCreateInput {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
  license_number?: string | null;
  contact_phone?: string | null;
  is_verified: boolean;
}

export interface DashboardStats {
  total_passengers: number;
  total_operators: number;
  total_buses: number;
  total_routes: number;
  total_trips: number;
  total_bookings: number;
  confirmed_bookings: number;
  pending_payments: number;
  cancelled_bookings: number;
  total_revenue: number;
  refunded_amount: number;
  net_revenue: number;
  seats_sold: number;
  occupancy_rate: number;
}

export interface NamedValue {
  name: string;
  value: number;
}

export interface DashboardCharts {
  booking_trend: { label: string; value: number }[];
  revenue_trend: { label: string; value: number }[];
  popular_routes: NamedValue[];
  payment_status_distribution: NamedValue[];
  bus_type_distribution: NamedValue[];
  occupancy_by_trip: NamedValue[];
}

export interface DashboardResponse {
  stats: DashboardStats;
  charts: DashboardCharts;
}

export interface RefundOut {
  id: string;
  payment_id: string;
  booking_id: string;
  amount: number;
  currency: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "PROCESSED";
  reason?: string | null;
  reference: string;
  created_at: string;
  processed_at?: string | null;
}

export interface AuditLogOut {
  id: string;
  actor_user_id?: string | null;
  actor_role?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  ip_address?: string | null;
  detail?: Record<string, unknown> | null;
  created_at: string;
}