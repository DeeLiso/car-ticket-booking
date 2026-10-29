import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BellRing,
  Building2,
  Bus,
  BusFront,
  CalendarClock,
  LayoutDashboard,
  QrCode,
  Route as RouteIcon,
  RotateCcw,
  ScanLine,
  ScrollText,
  Ticket,
  User,
  Wallet,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export function navFor(role: string): NavGroup[] {
  switch (role) {
    case "ADMIN":
      return [
        {
          title: "nav.overview",
          items: [
            { to: "/admin", label: "nav.dashboard", icon: LayoutDashboard },
            { to: "/admin/bookings", label: "nav.bookingAlerts", icon: BellRing },
          ],
        },
        {
          title: "nav.operations",
          items: [
            { to: "/admin/operators", label: "nav.operators", icon: Building2 },
            { to: "/admin/fleet", label: "nav.businessBuses", icon: Bus },
            { to: "/admin/routes", label: "nav.routes", icon: RouteIcon },
            { to: "/admin/buses", label: "nav.buses", icon: BusFront },
            { to: "/admin/trips", label: "nav.trips", icon: CalendarClock },
          ],
        },
        {
          title: "nav.finance",
          items: [
            { to: "/admin/refunds", label: "nav.refunds", icon: RotateCcw },
            { to: "/operator/scan", label: "nav.scanTicket", icon: ScanLine },
          ],
        },
        {
          title: "nav.system",
          items: [{ to: "/admin/audit", label: "nav.auditLogs", icon: ScrollText }],
        },
      ];
    case "BUS_OPERATOR":
      return [
        {
          title: "nav.overview",
          items: [{ to: "/operator", label: "nav.dashboard", icon: LayoutDashboard }],
        },
        {
          title: "nav.fleet",
          items: [
            { to: "/operator/buses", label: "nav.myBuses", icon: Bus },
            { to: "/operator/trips", label: "nav.myTrips", icon: CalendarClock },
          ],
        },
        {
          title: "nav.tools",
          items: [{ to: "/operator/scan", label: "nav.scanTicket", icon: ScanLine }],
        },
      ];
    default:
      return [
        {
          title: "nav.booking",
          items: [
            { to: "/account", label: "nav.myBookings", icon: Ticket },
            { to: "/account/tickets", label: "nav.myTickets", icon: QrCode },
          ],
        },
        {
          title: "nav.account",
          items: [
            { to: "/account/profile", label: "nav.profile", icon: User },
            { to: "/account/payments", label: "nav.payments", icon: Wallet },
            { to: "/account/notifications", label: "nav.notifications", icon: Bell },
          ],
        },
      ];
  }
}
