import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

interface PdfViewerProps {
  /** Object URL of the PDF blob. */
  url: string;
  onDownload: () => void;
}


export default function PdfViewer({ url, onDownload }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    setStatus("loading");
    container.replaceChildren();

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

        const data = await (await fetch(url)).arrayBuffer();
        if (cancelled) return;

        task = pdfjs.getDocument({ data });
        const pdf = await task.promise;
        if (cancelled) return;

        const cssWidth = container.clientWidth;
        // Capped at 2x: sharper than that just burns memory on phones.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          if (cancelled) return;

          const base = page.getViewport({ scale: 1 });
          const scale = cssWidth / base.width;
          const viewport = page.getViewport({ scale: scale * dpr });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${cssWidth}px`;
          canvas.style.height = `${viewport.height / dpr}px`;
          canvas.className = "mb-2 block bg-white";
          container.appendChild(canvas);

          await page.render({
            canvas,
            canvasContext: canvas.getContext("2d")!,
            viewport,
          }).promise;
          page.cleanup();

          if (n === 1 && !cancelled) setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      void task?.destroy();
      container.replaceChildren();
    };
  }, [url]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className={`h-full w-full overflow-y-auto overscroll-contain ${status === "error" ? "hidden" : ""}`}
      />

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-ink-muted)]" />
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <AlertCircle className="h-6 w-6 text-[var(--color-danger)]" />
          <p className="text-[14px] text-[var(--color-ink-muted)]">Could not display this PDF.</p>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2 text-[14px] font-semibold text-[var(--color-accent-contrast)]"
          >
            <Download className="h-[15px] w-[15px]" />
            Download
          </button>
        </div>
      )}
    </div>
  );
}