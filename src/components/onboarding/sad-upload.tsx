"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, FileCode2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/client";
import { ToastForm } from "@/components/guide/toast-form";
import { cn } from "@/lib/utils";

function fmtSize(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Drag-and-drop card for the empty-SAD sample. Keeps a real <input type="file" name="file"> inside the form. */
export function SadUpload({ action, uploaded }: { action: (formData: FormData) => Promise<void>; uploaded: boolean }) {
  const t = useTranslations("wizard");
  const input = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [over, setOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function pick(f: File | undefined | null) {
    if (!f) return;
    if (!/\.xml$/i.test(f.name)) {
      setError(t("notXml"));
      setFile(null);
      if (input.current) input.current.value = "";
      return;
    }
    setError(null);
    setFile(f);
    // reflect the dropped file into the real input so the form posts it
    if (input.current) {
      const dt = new DataTransfer();
      dt.items.add(f);
      input.current.files = dt.files;
    }
  }

  function clear() {
    setFile(null);
    setError(null);
    if (input.current) input.current.value = "";
  }

  return (
    <ToastForm action={action} success={t("sadUploaded")} failure={t("sadFailed")} onDone={clear} className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors focus-within:ring-3 focus-within:ring-ring/35",
          over ? "border-primary bg-accent" : "border-input bg-muted/40 hover:border-primary/60",
          uploaded && !file && "border-success/50 bg-success/5",
        )}
      >
        {file ? (
          <FileCode2 aria-hidden className="size-8 text-primary" />
        ) : uploaded ? (
          <CircleCheck aria-hidden className="size-8 text-success" />
        ) : (
          <UploadCloud aria-hidden className={cn("size-8 text-muted-foreground transition-transform", over && "-translate-y-1 text-primary")} />
        )}
        <label htmlFor="sad-file" className="cursor-pointer text-sm font-medium after:absolute after:inset-0">
          {file ? file.name : over ? t("dropRelease") : uploaded ? t("dropReplace") : t("dropTitle")}
        </label>
        <p className="text-xs text-muted-foreground">{file ? fmtSize(file.size) : t("dropHint")}</p>
        <input
          ref={input}
          id="sad-file"
          type="file"
          name="file"
          accept=".xml,text/xml,application/xml"
          required
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton variant="secondary" size="sm" disabled={!file}>
          <UploadCloud aria-hidden />
          {t("upload")}
        </SubmitButton>
        {file ? (
          <Button variant="ghost" size="sm" onClick={clear}>
            <X aria-hidden />
            {t("removeFile")}
          </Button>
        ) : null}
      </div>
    </ToastForm>
  );
}
