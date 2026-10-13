"use client";

import * as React from "react";
import { ExternalLink, FileQuestion, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SourceBbox } from "@/db/schema";
import { cn } from "@/lib/utils";

export type ViewerDoc = { id: string; mime: string; fileName: string } | null;

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const STEP = 0.25;

/**
 * Original-document viewer with zoom. For images the bbox of the focused invoice line (normalized 0-1, page 1)
 * is drawn as an overlay and scrolled into view; PDFs render in the browser's own viewer without overlay.
 */
export function DocViewer({ doc, bbox, activeLabel, className }: { doc: ViewerDoc; bbox: SourceBbox | null; activeLabel: string | null; className?: string }) {
  const t = useTranslations("lines");
  const [zoom, setZoom] = React.useState(1);
  const scroller = React.useRef<HTMLDivElement>(null);
  const stage = React.useRef<HTMLDivElement>(null);
  const isImage = !!doc && doc.mime.startsWith("image/");
  const isPdf = !!doc && doc.mime === "application/pdf";
  const overlay = isImage && bbox && bbox.page === 1 ? bbox : null;

  // bring the highlighted line into view when the focused row (or zoom) changes
  React.useEffect(() => {
    const box = scroller.current;
    const el = stage.current;
    if (!overlay || !box || !el) return;
    const top = el.offsetHeight * overlay.y - box.clientHeight / 3;
    const left = el.offsetWidth * overlay.x - box.clientWidth / 6;
    box.scrollTo({ top: Math.max(0, top), left: Math.max(0, left), behavior: "smooth" });
  }, [overlay, zoom]);

  const clamp = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));
  const pct = Math.round(zoom * 100);

  return (
    <Card className={cn("flex min-h-0 flex-col", className)}>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-3">
        <div className="min-w-0">
          <CardTitle className="text-sm">{t("original")}</CardTitle>
          {doc ? <p className="truncate text-xs text-muted-foreground">{doc.fileName}</p> : null}
        </div>
        {isImage ? (
          <div className="flex shrink-0 items-center gap-1" role="group" aria-label={t("zoom")}>
            <IconBtn label={t("zoomOut")} onClick={() => setZoom((z) => clamp(z - STEP))} disabled={zoom <= MIN_ZOOM}>
              <ZoomOut className="size-4" aria-hidden />
            </IconBtn>
            <button
              type="button"
              onClick={() => setZoom(1)}
              aria-label={t("zoomReset")}
              className="num h-8 min-w-12 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
            >
              {pct}%
            </button>
            <IconBtn label={t("zoomIn")} onClick={() => setZoom((z) => clamp(z + STEP))} disabled={zoom >= MAX_ZOOM}>
              <ZoomIn className="size-4" aria-hidden />
            </IconBtn>
          </div>
        ) : null}
        {doc ? (
          <a
            href={`/api/files/${doc.id}`}
            target="_blank"
            rel="noreferrer"
            aria-label={t("openOriginal")}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
          >
            <ExternalLink className="size-4" aria-hidden />
          </a>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0 sm:p-3 sm:pt-0">
        {isImage && doc ? (
          <>
            <div
              ref={scroller}
              tabIndex={0}
              role="region"
              aria-label={doc.fileName}
              className="scrollbar-thin max-h-[60dvh] overflow-auto rounded-lg border bg-muted/40 lg:max-h-[calc(100dvh-14rem)]"
            >
              <div ref={stage} className="relative transition-[width] duration-200" style={{ width: `${zoom * 100}%` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/files/${doc.id}`} alt={doc.fileName} className="block h-auto w-full select-none" draggable={false} />
                {overlay ? (
                  <div
                    key={`${overlay.x}-${overlay.y}-${overlay.w}-${overlay.h}`}
                    aria-hidden
                    className="pointer-events-none absolute animate-pop-in rounded-sm border-2 border-primary bg-primary/20 shadow-[0_0_0_9999px_color-mix(in_oklab,var(--foreground)_10%,transparent)]"
                    style={{ left: `${overlay.x * 100}%`, top: `${overlay.y * 100}%`, width: `${overlay.w * 100}%`, height: `${overlay.h * 100}%` }}
                  />
                ) : null}
              </div>
            </div>
            <div className="flex min-h-6 items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
              {activeLabel ? <Badge tone="brand">{activeLabel}</Badge> : null}
              {activeLabel && !overlay ? <span>{t("noBbox")}</span> : !activeLabel ? <span>{t("focusHint")}</span> : null}
            </div>
          </>
        ) : isPdf && doc ? (
          <>
            <iframe src={`/api/files/${doc.id}`} title={doc.fileName} className="h-[60dvh] w-full rounded-lg border bg-card lg:h-[calc(100dvh-14rem)]" />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Maximize2 className="size-3" aria-hidden />
              {t("overlayImagesOnly")}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
            <FileQuestion className="size-8" aria-hidden />
            {t("noPreview")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IconBtn({ label, children, ...props }: { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-40"
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
