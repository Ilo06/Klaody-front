import { AlertCircle, ExternalLink, MapPin, X } from "lucide-react";
import { Skeleton } from "./Skeleton";
import { ApiError, type FileMetadata } from "../lib/api";
import { formatBytes } from "../lib/format";
import {
  exposureSummary,
  formatAperture,
  formatCoordinates,
  formatEv,
  formatMm,
  formatShutter,
  formatTakenAt,
  mapUrl,
  useImageDetails,
} from "../lib/fileDetails";

type Row = [label: string, value: string | null | undefined];

function Section({ title, rows }: { title: string; rows: Row[] }) {
  const visible = rows.filter((row): row is [string, string] => row[1] !== null && row[1] !== undefined && row[1] !== "");
  if (visible.length === 0) return null;
  return (
    <section>
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">{title}</h3>
      <dl className="mt-2 space-y-2">
        {visible.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 text-[13px]">
            <dt className="shrink-0 text-[var(--color-ink-muted)]">{label}</dt>
            <dd className="min-w-0 break-words text-right tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Photo details of an image: file info, camera settings (ISO, aperture, shutter, focal length…) and location. */
export default function FileDetailsPanel({ file, onClose }: { file: FileMetadata; onClose: () => void }) {
  const { data, isLoading, error } = useImageDetails(file.id, true);

  const exif = data?.exif ?? null;
  const camera = exif ? [exif.cameraMake, exif.cameraModel].filter(Boolean).join(" ") : "";
  const summary = exif ? exposureSummary(exif) : "";
  const dimensions = data?.width && data?.height ? `${data.width} × ${data.height}` : null;

  return (
    <aside
      aria-label="Image details"
      className="absolute inset-x-0 bottom-0 z-20 flex max-h-[65%] flex-col rounded-t-xl border-t border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl sm:static sm:max-h-none sm:w-72 sm:shrink-0 sm:rounded-none sm:border-l sm:border-t-0 sm:shadow-none"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5">
        <h2 className="text-[14px] font-medium">Details</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          title="Close details (i)"
          className="rounded-full p-1.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : error ? (
          <p className="flex items-center gap-1.5 text-[13px] text-[var(--color-danger)]">
            <AlertCircle className="h-[13px] w-[13px] shrink-0" />
            {error instanceof ApiError ? error.message : "Could not load the details"}
          </p>
        ) : (
          data && (
            <>
              {(camera || summary) && (
                <div>
                  {camera && <p className="text-[15px] font-medium">{camera}</p>}
                  {exif?.lens && <p className="text-[12px] text-[var(--color-ink-muted)]">{exif.lens}</p>}
                  {summary && <p className="mt-1.5 text-[13px] tabular-nums">{summary}</p>}
                </div>
              )}

              <Section
                title="File"
                rows={[
                  ["Name", file.name],
                  ["Size", formatBytes(file.size)],
                  ["Dimensions", dimensions],
                  ["Format", data.format ? data.format.toUpperCase() : null],
                  ["Taken", exif?.takenAt ? formatTakenAt(exif.takenAt) : null],
                ]}
              />

              {exif && (
                <Section
                  title="Camera"
                  rows={[
                    ["ISO", exif.iso !== null ? String(exif.iso) : null],
                    ["Aperture", exif.fNumber !== null ? formatAperture(exif.fNumber) : null],
                    ["Shutter speed", exif.exposureTime !== null ? formatShutter(exif.exposureTime) : null],
                    ["Focal length", exif.focalLength !== null ? formatMm(exif.focalLength) : null],
                    ["35mm equivalent", exif.focalLength35mm !== null ? formatMm(exif.focalLength35mm) : null],
                    ["Exposure bias", exif.exposureBias !== null ? formatEv(exif.exposureBias) : null],
                    ["Metering", exif.meteringMode],
                    ["White balance", exif.whiteBalance],
                    ["Flash", exif.flash],
                    ["Software", exif.software],
                  ]}
                />
              )}

              {data.gps && (
                <section>
                  <h3 className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">Location</h3>
                  <p className="mt-2 flex items-start gap-1.5 text-[13px] tabular-nums">
                    <MapPin className="mt-0.5 h-[14px] w-[14px] shrink-0 text-[var(--color-ink-muted)]" />
                    {formatCoordinates(data.gps)}
                  </p>
                  {data.gps.altitude !== null && (
                    <p className="mt-1 pl-5 text-[12px] text-[var(--color-ink-muted)]">
                      Altitude {Math.round(data.gps.altitude)} m
                    </p>
                  )}
                  <a
                    href={mapUrl(data.gps)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 pl-5 text-[13px] text-[var(--color-accent)] hover:underline"
                  >
                    Open in OpenStreetMap
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </section>
              )}

              {!exif && !data.gps && (
                <p className="text-[13px] text-[var(--color-ink-muted)]">
                  This image carries no camera or location data (screenshots and re-encoded images usually don't).
                </p>
              )}
            </>
          )
        )}
      </div>
    </aside>
  );
}
