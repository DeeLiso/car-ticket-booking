import { Route, Routes, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RequireAuth, RequireRole } from "@/components/layout/guards";
import { AppShell } from "@/components/layout/AppShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { CookieConsentProvider } from "@/components/cookies/CookieConsentProvider";
import { PwaManager } from "@/components/pwa/PwaManager";
import { LandingPage } from "@/pages/public/LandingPage";
import { AboutPage } from "@/pages/public/AboutPage";
import { CookiePolicyPage } from "@/pages/public/CookiePolicyPage";
import { CalendarPage } from "@/pages/public/CalendarPage";
import { BookingCalendarPage } from "@/pages/public/BookingCalendarPage";
import { SearchPage } from "@/pages/public/SearchPage";
import { TripDetailPage } from "@/pages/public/TripDetailPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { CheckoutPage } from "@/pages/passenger/CheckoutPage";
import { MyBookingsPage } from "@/pages/passenger/MyBookingsPage";
import { BookingDetailPage } from "@/pages/passenger/BookingDetailPage";
import { TicketPage } from "@/pages/passenger/TicketPage";
import { TicketsListPage } from "@/pages/passenger/TicketsListPage";
import { AccountProfilePage } from "@/pages/passenger/AccountProfilePage";
import { SettingsPage } from "@/pages/passenger/SettingsPage";
import { PaymentsPage } from "@/pages/passenger/PaymentsPage";
import { NotificationsPage } from "@/pages/passenger/NotificationsPage";
import { OperatorDashboardPage } from "@/pages/operator/OperatorDashboardPage";
import { OperatorBusesPage } from "@/pages/operator/OperatorBusesPage";
import { OperatorTripsPage } from "@/pages/operator/OperatorTripsPage";
import { OperatorManifestPage } from "@/pages/operator/OperatorManifestPage";
import { ScanPage } from "@/pages/operator/ScanPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminBookingsPage } from "@/pages/admin/AdminBookingsPage";
import { AdminOperatorsPage } from "@/pages/admin/AdminOperatorsPage";
import { AdminFleetPage } from "@/pages/admin/AdminFleetPage";
import { AdminRoutesPage } from "@/pages/admin/AdminRoutesPage";
import { AdminBusesPage } from "@/pages/admin/AdminBusesPage";
import { AdminTripsPage } from "@/pages/admin/AdminTripsPage";
import { AdminRefundsPage } from "@/pages/admin/AdminRefundsPage";
import { AdminAuditPage } from "@/pages/admin/AdminAuditPage";
import { NotFoundPage } from "@/pages/public/NotFoundPage";

export function App() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  // The calendar is a standalone, full-screen experience — no app chrome.
  const standalone = pathname === "/calendar";

  return (
    <CookieConsentProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        {t("common.skipToContent")}
      </a>
      <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/cookies" element={<CookiePolicyPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/booking" element={<BookingCalendarPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/trips/:tripId" element={<TripDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Passenger (protected) */}
      <Route
        path="/trips/:tripId/checkout"
        element={
          <RequireAuth>
            <CheckoutPage />
          </RequireAuth>
        }
      />
      <Route
        path="/account"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<MyBookingsPage />} />
        <Route path="bookings/:bookingId" element={<BookingDetailPage />} />
        <Route path="tickets" element={<TicketsListPage />} />
        <Route path="tickets/:ticketId" element={<TicketPage />} />
        <Route path="profile" element={<AccountProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      {/* Operator */}
      <Route
        path="/operator"
        element={
          <RequireRole roles={["BUS_OPERATOR", "ADMIN"]}>
            <AppShell />
          </RequireRole>
        }
      >
        <Route index element={<OperatorDashboardPage />} />
        <Route path="buses" element={<OperatorBusesPage />} />
        <Route path="trips" element={<OperatorTripsPage />} />
        <Route path="trips/:tripId/manifest" element={<OperatorManifestPage />} />
        <Route path="scan" element={<ScanPage />} />
      </Route>

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <RequireRole roles={["ADMIN"]}>
            <AppShell />
          </RequireRole>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="bookings" element={<AdminBookingsPage />} />
        <Route path="operators" element={<AdminOperatorsPage />} />
        <Route path="fleet" element={<AdminFleetPage />} />
        <Route path="routes" element={<AdminRoutesPage />} />
        <Route path="buses" element={<AdminBusesPage />} />
        <Route path="trips" element={<AdminTripsPage />} />
        <Route path="refunds" element={<AdminRefundsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {!standalone && <BottomNav />}
      {!standalone && <div className="h-28 lg:hidden" aria-hidden="true" />}
      <PwaManager />
    </CookieConsentProvider>
  );
}