import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { cityCoords, type LatLng } from "@/utils/geo";

export interface MapRoute {
  id: string;
  origin: string;
  destination: string;
  color: string;
}

const MYANMAR_BOUNDS = L.latLngBounds(
  L.latLng(9.5, 92),
  L.latLng(28.5, 101.5),
);

interface TileProvider {
  url: string;
  attribution: string;
}

const DARK_PROVIDERS: TileProvider[] = [
  {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  {
    url: "https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
];

const LIGHT_PROVIDERS: TileProvider[] = [
  {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
];

function waypointIcon(color: string, isOrigin: boolean, label: string) {
  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);min-width:max-content">
      <div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>
      <span style="margin-top:3px;font:600 10px/1.15 'Manrope',sans-serif;color:#0f172a;background:rgba(255,255,255,.94);border-radius:6px;padding:2px 6px;box-shadow:0 1px 5px rgba(0,0,0,.28);white-space:nowrap;text-align:center">${isOrigin ? "● Origin" : "■ Destination"} · ${label}</span>
    </div>`;
  return L.divIcon({ className: "", html, iconSize: [0, 0], iconAnchor: [0, 0] });
}

function routePoints(r: MapRoute): [LatLng, LatLng] | null {
  const o = cityCoords(r.origin);
  const d = cityCoords(r.destination);
  return o && d ? [o, d] : null;
}

function FitRoutes({ routes }: { routes: MapRoute[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = routes.map(routePoints).filter(Boolean) as [LatLng, LatLng][];
    if (pts.length === 0) return;
    map.fitBounds(L.latLngBounds(pts.flat().map((p) => L.latLng(p.lat, p.lng))), {
      padding: [44, 44],
    });
  }, [map, routes]);
  return null;
}

function RoutingLayer({ routes }: { routes: MapRoute[] }) {
  const map = useMap();
  useEffect(() => {
    const controls: L.Routing.Control[] = [];
    routes.forEach((r) => {
      const pts = routePoints(r);
      if (!pts) return;
      // createMarker exists on the plugin's control options but is missing from the typings.
      type ControlOptions = L.Routing.RoutingControlOptions & {
        createMarker: (waypointIndex: number, waypoint: L.Routing.Waypoint, numberOfWaypoints: number) => L.Marker;
      };
      const options: ControlOptions = {
        waypoints: [L.latLng(pts[0].lat, pts[0].lng), L.latLng(pts[1].lat, pts[1].lng)],
        router: L.Routing.osrmv1({
          serviceUrl: "https://router.project-osrm.org/route/v1",
          profile: "driving",
        }),
        show: false,
        addWaypoints: false,
        fitSelectedRoutes: false,
        lineOptions: {
          styles: [{ color: r.color, weight: 4, opacity: 0.9, dashArray: "7 9" }],
          extendToWaypoints: true,
          missingRouteTolerance: 1,
        },
        createMarker: (i, wp) =>
          L.marker(wp.latLng, { icon: waypointIcon(r.color, i === 0, i === 0 ? r.origin : r.destination) }),
      };
      const ctl = L.Routing.control(options);
      ctl.on("routingfail", () => {
        // Silent fail: the straight-line fallback polyline below stays visible.
      });
      ctl.addTo(map);
      controls.push(ctl);
    });
    return () => {
      controls.forEach((c) => c.remove());
    };
  }, [map, routes]);
  return null;
}

export function FleetRouteMap({ routes, dark = false }: { routes: MapRoute[]; dark?: boolean }) {
  const providers = dark ? DARK_PROVIDERS : LIGHT_PROVIDERS;
  const [tileIdx, setTileIdx] = useState(0);
  const idx = Math.min(tileIdx, providers.length - 1);
  const tileErrorCount = useRef(0);
  const lines = useMemo(
    () =>
      routes
        .map((r) => ({ r, pts: routePoints(r) }))
        .filter((l): l is { r: MapRoute; pts: [LatLng, LatLng] } => l.pts !== null),
    [routes],
  );
  const bounds = useMemo(() => {
    const all = lines.flatMap((l) => l.pts);
    return all.length > 0
      ? L.latLngBounds(all.map((p) => L.latLng(p.lat, p.lng))).pad(2.2)
      : MYANMAR_BOUNDS;
  }, [lines]);

  return (
    <MapContainer
      bounds={bounds}
      center={[21.0, 96.0]}
      zoom={6}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", background: providers[idx].url.includes("openstreetmap.org") ? "#e2e8f0" : "#0b1220" }}
      className="z-0"
    >
      <TileLayer
        key={`${dark}-${idx}`}
        attribution={providers[idx].attribution}
        url={providers[idx].url}
        eventHandlers={{
          tileerror: () => {
            if (idx >= providers.length - 1) return;
            tileErrorCount.current += 1;
            if (tileErrorCount.current >= 3) {
              tileErrorCount.current = 0;
              setTileIdx((i) => i + 1);
            }
          },
        }}
      />
      <FitRoutes routes={routes} />
      {lines.map(({ r, pts: [o, d] }) => (
        <Polyline
          key={`fallback-${r.id}`}
          positions={[
            [o.lat, o.lng],
            [d.lat, d.lng],
          ]}
          pathOptions={{ color: r.color, weight: 3, opacity: 0.35, dashArray: "2 8" }}
        />
      ))}
      <RoutingLayer routes={routes} />
    </MapContainer>
  );
}