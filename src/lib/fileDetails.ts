import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./api";

export interface ImageExif {
  cameraMake: string | null;
  cameraModel: string | null;
  lens: string | null;
  /** Camera wall-clock time, "YYYY-MM-DDTHH:MM:SS" with no timezone. Display as-is, never convert. */
  takenAt: string | null;
  iso: number | null;
  fNumber: number | null;
  /** Seconds. */
  exposureTime: number | null;
  /** mm. */
  focalLength: number | null;
  focalLength35mm: number | null;
  /** EV. */
  exposureBias: number | null;
  flash: string | null;
  meteringMode: string | null;
  whiteBalance: string | null;
  software: string | null;
}

export interface ImageGps {
  latitude: number;
  longitude: number;
  altitude: number | null;
}

export interface ImageDetails {
  width: number | null;
  height: number | null;
  format: string | null;
  /** null = the file carries no EXIF (screenshots, stripped photos). */
  exif: ImageExif | null;
  /** null = no location in the file. */
  gps: ImageGps | null;
}

export async function getImageDetails(id: string): Promise<ImageDetails> {
  const { data } = await apiClient.get<ImageDetails>(`/files/${id}/details`);
  return data;
}

/** Only fetched while the details panel is open (`enabled`). */
export function useImageDetails(id: string, enabled: boolean) {
  return useQuery<ImageDetails>({
    queryKey: ["files", id, "details"],
    queryFn: () => getImageDetails(id),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

// --- Formatting -------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "20 Oct 2026, 14:03" — straight from the string so the timezone of the viewer never shifts it. */
export function formatTakenAt(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return value;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}, ${m[4]}:${m[5]}`;
}

/** 0.004 -> "1/250 s", 2 -> "2 s", 0.3 -> "1/3 s". */
export function formatShutter(seconds: number): string {
  if (seconds >= 1) return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)} s`;
  return `1/${Math.round(1 / seconds)} s`;
}

export function formatAperture(fNumber: number): string {
  return `f/${Number.isInteger(fNumber) ? fNumber : fNumber.toFixed(1)}`;
}

export function formatMm(mm: number): string {
  return `${Number.isInteger(mm) ? mm : mm.toFixed(1)} mm`;
}

export function formatEv(ev: number): string {
  if (ev === 0) return "0 EV";
  return `${ev > 0 ? "+" : "−"}${Math.abs(ev).toFixed(Math.abs(ev) % 1 === 0 ? 0 : 1)} EV`;
}

/** 18.8667 S, 47.5167 E (4 decimals ≈ 10 m). */
export function formatCoordinates({ latitude, longitude }: ImageGps): string {
  const lat = `${Math.abs(latitude).toFixed(5)}° ${latitude >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(longitude).toFixed(5)}° ${longitude >= 0 ? "E" : "W"}`;
  return `${lat}, ${lon}`;
}

export function mapUrl({ latitude, longitude }: ImageGps): string {
  const lat = latitude.toFixed(6);
  const lon = longitude.toFixed(6);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;
}

/** "ISO 800 · f/1.8 · 1/250 s · 35 mm" — the line photographers read first. Empty when none of them is known. */
export function exposureSummary(exif: ImageExif): string {
  return [
    exif.iso !== null ? `ISO ${exif.iso}` : null,
    exif.fNumber !== null ? formatAperture(exif.fNumber) : null,
    exif.exposureTime !== null ? formatShutter(exif.exposureTime) : null,
    exif.focalLength !== null ? formatMm(exif.focalLength) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
