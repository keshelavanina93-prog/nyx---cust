"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Camera, CloudUpload, FileJson, FileText, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/client";
import { cn } from "@/lib/utils";

export type UploadKind = { value: string; label: string };

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = "application/pdf,image/*,.json,application/json";

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toUpperCase() : "";
}
function isAllowed(f: File) {
  return f.type === "application/pdf" || f.type.startsWith("image/") || f.type === "application/json" || f.name.toLowerCase().endsWith(".json");
}
function sizeLabel(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
const sig = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

type Problem = "size" | "type" | null;
function problemOf(f: File): Problem {
  if (f.size > MAX_BYTES) return "size";
  if (!isAllowed(f)) return "type";
  return null;
}

/**
 * Drag-and-drop upload zone. The real `<input name="files" data-testid="file-input">` stays inside the form (visually hidden)
 * so native form submission, server action FormData and Playwright `setInputFiles` keep working.
 */
export function UploadDropzone({ action, kinds, defaultKind = "invoice" }: { action: (formData: FormData) => Promise<void>; kinds: UploadKind[]; defaultKind?: string }) {
  const t = useTranslations("shipment");
  const formRef = React.useRef<HTMLFormElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const depth = React.useRef(0);

  const commit = React.useCallback((next: File[]) => {
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;
    setFiles(next);
  }, []);
  const addFiles = React.useCallback(
    (incoming: File[]) => {
      if (!incoming.length) return;
      setSubmitted(false);
      const seen = new Set(files.map(sig));
      commit([...files, ...incoming.filter((f) => !seen.has(sig(f)))]);
    },
    [files, commit],
  );

  // React resets the form after the server action finished -> drop the previews with it
  React.useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const onReset = () => {
      setFiles([]);
      setSubmitted(false);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const urls = useObjectUrls(files);
  const hasProblem = files.some((f) => problemOf(f));

  return (
    <form ref={formRef} action={action} onSubmit={() => setSubmitted(true)} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("docKind")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {kinds.map((k) => (
            <label
              key={k.value}
              className="cursor-pointer rounded-full border border-input bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:text-accent-foreground has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/35"
            >
              <input type="radio" name="kind" value={k.value} defaultChecked={k.value === defaultKind} className="sr-only" />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          depth.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          depth.current = 0;
          setDragging(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-[border-color,background-color,transform]",
          dragging ? "scale-[1.01] border-primary bg-accent" : "border-input bg-muted/30 hover:border-primary/60 hover:bg-accent/50",
        )}
      >
        <div className={cn("flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform", dragging && "scale-110")}>
          <CloudUpload className="size-6" aria-hidden />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">{dragging ? t("dropHere") : t("dragHere")}</p>
          <p className="text-xs text-muted-foreground">{t("uploadInvoice")}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            {t("browse")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="md:hidden" onClick={() => cameraRef.current?.click()}>
            <Camera aria-hidden />
            {t("takePhoto")}
          </Button>
        </div>
        <input
          ref={inputRef}
          name="files"
          type="file"
          multiple
          required
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          data-testid="file-input"
          aria-label={t("uploadInvoice")}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => addFiles(Array.from(e.currentTarget.files ?? []))}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-label={t("takePhoto")}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            addFiles(Array.from(e.currentTarget.files ?? []));
            e.currentTarget.value = "";
          }}
        />
      </div>

      <FileList files={files} urls={urls} submitted={submitted} onRemove={(f) => commit(files.filter((x) => x !== f))} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t("uploadMore")}</p>
        <SubmitButton disabled={files.length === 0 || hasProblem} pendingText={t("uploading")} data-testid="upload">
          {files.length ? t("uploadCount", { n: files.length }) : t("uploadFiles")}
        </SubmitButton>
      </div>
    </form>
  );
}

function useObjectUrls(files: File[]) {
  const [urls, setUrls] = React.useState<Map<File, string>>(() => new Map());
  React.useEffect(() => {
    const map = new Map<File, string>();
    for (const f of files) if (f.type.startsWith("image/")) map.set(f, URL.createObjectURL(f));
    setUrls(map);
    return () => map.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);
  return urls;
}

function FileList({ files, urls, submitted, onRemove }: { files: File[]; urls: Map<File, string>; submitted: boolean; onRemove: (f: File) => void }) {
  const t = useTranslations("shipment");
  const tc = useTranslations("common");
  const { pending } = useFormStatus();
  if (pending) {
    return (
      <div role="status" className="space-y-2 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
          {t("uploadingN", { n: files.length })}
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="bg-shimmer absolute inset-0 animate-shimmer bg-primary/60" />
        </div>
      </div>
    );
  }
  if (submitted || files.length === 0) return null;
  return (
    <ul className="grid gap-2 sm:grid-cols-2" aria-label={t("selectedFiles")}>
      {files.map((f) => {
        const problem = problemOf(f);
        const url = urls.get(f);
        return (
          <li key={sig(f)} className={cn("animate-pop-in flex items-center gap-3 rounded-xl border bg-card p-2.5 shadow-xs", problem && "border-danger/50 bg-danger/5")}>
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="size-full object-cover" />
              ) : f.name.toLowerCase().endsWith(".json") ? (
                <FileJson className="size-5" aria-hidden />
              ) : (
                <FileText className="size-5" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{f.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Badge className="px-1.5 py-0 text-[10px]">{extOf(f.name) || "FILE"}</Badge>
                <span className="num">{sizeLabel(f.size)}</span>
                {problem ? <span className="font-medium text-danger">{problem === "size" ? t("fileTooBig") : t("fileBadType")}</span> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemove(f)}
              aria-label={`${tc("delete")}: ${f.name}`}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
