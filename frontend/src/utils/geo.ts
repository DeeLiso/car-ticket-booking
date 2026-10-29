export interface LatLng {
  lat: number;
  lng: number;
}

const CITY_COORDS: Record<string, LatLng> = {
  Yangon: { lat: 16.8409, lng: 96.1735 },
  Mandalay: { lat: 21.9588, lng: 96.0891 },
  Naypyidaw: { lat: 19.7633, lng: 96.0785 },
  Bagan: { lat: 21.173, lng: 94.8612 },
  Taunggyi: { lat: 20.7894, lng: 97.0346 },
  Mawlamyine: { lat: 16.4905, lng: 97.6283 },
  Pyay: { lat: 18.8162, lng: 95.2115 },
  Pathein: { lat: 16.7833, lng: 94.7333 },
  "Hpa-An": { lat: 16.8897, lng: 97.6348 },
  Kyaikhto: { lat: 17.3086, lng: 97.0139 },
  "Pyin Oo Lwin": { lat: 22.008, lng: 96.456 },
  Dawei: { lat: 14.097, lng: 98.2113 },
  Myeik: { lat: 12.439, lng: 98.606 },
  Lashio: { lat: 22.9406, lng: 97.7497 },
  Monywa: { lat: 22.1141, lng: 95.1353 },
  Sittwe: { lat: 20.1495, lng: 92.9024 },
  Bago: { lat: 17.335, lng: 96.4815 },
  Taungoo: { lat: 18.9333, lng: 96.4167 },
};

export function cityCoords(name: string): LatLng | undefined {
  return CITY_COORDS[name];
}

export const FLEET_COLORS = [
  "#2445e0",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
];