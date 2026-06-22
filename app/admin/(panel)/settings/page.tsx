"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { settingsSchema } from "@/lib/settings-schema";
import { updateSettingsGroup } from "./actions";
import { createClient } from "@/lib/supabase/client";

type Settings = Record<string, string>;

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient()
      .from("site_settings")
      .select("key, value")
      .then(({ data }) => {
        if (data) {
          setSettings(Object.fromEntries(data.map((r) => [r.key, r.value ?? ""])));
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-slate">
        <Icon name="progress_activity" size={22} className="animate-spin" />
        Loading settings…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-navy">Site Settings</h1>
      <p className="mt-1 text-sm text-slate">
        Edit your website content, contact details, and hero section.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {settingsSchema.map((section) => (
          <SettingsSection
            key={section.group}
            section={section}
            settings={settings}
            onSave={(updated) => setSettings((prev) => ({ ...prev, ...updated }))}
          />
        ))}
      </div>
    </div>
  );
}

function SettingsSection({
  section,
  settings,
  onSave,
}: {
  section: (typeof settingsSchema)[number];
  settings: Settings;
  onSave: (updated: Settings) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setStatus("idle");

    startTransition(async () => {
      const result = await updateSettingsGroup(fd);
      if (result.error) {
        setErrorMsg(result.error);
        setStatus("error");
      } else {
        setStatus("ok");
        const updated: Settings = {};
        section.fields.forEach((f) => {
          updated[f.key] = String(fd.get(f.key) ?? "");
        });
        onSave(updated);
        setTimeout(() => setStatus("idle"), 3000);
      }
    });
  }

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-center gap-3 border-b border-line px-6 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-navy/5 text-navy-700">
          <Icon name={section.icon} size={20} />
        </span>
        <h2 className="font-display text-base font-semibold text-navy">{section.title}</h2>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="p-6">
        <input type="hidden" name="__group" value={section.group} />

        <div className="flex flex-col gap-5">
          {section.fields.map((field) => (
            <div key={field.key}>
              <input type="hidden" name={`__label_${field.key}`} value={field.label} />
              <input type="hidden" name={`__type_${field.key}`} value={field.type} />
              <label className="mb-1.5 block text-sm font-medium text-ink">
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  name={field.key}
                  defaultValue={settings[field.key] ?? ""}
                  rows={3}
                  className="w-full rounded-md border border-line bg-cream px-3.5 py-2.5 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                />
              ) : field.type === "image" ? (
                <ImageField
                  name={field.key}
                  defaultValue={settings[field.key] ?? ""}
                />
              ) : (
                <input
                  name={field.key}
                  type={field.type === "url" ? "url" : field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
                  defaultValue={settings[field.key] ?? ""}
                  className="w-full rounded-md border border-line bg-cream px-3.5 py-2.5 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
          >
            {isPending ? (
              <><Icon name="progress_activity" size={18} className="animate-spin" /> Saving…</>
            ) : (
              <><Icon name="save" size={18} /> Save</>
            )}
          </button>
          {status === "ok" && (
            <span className="flex items-center gap-1.5 text-sm text-available">
              <Icon name="check_circle" size={18} /> Saved successfully
            </span>
          )}
          {status === "error" && (
            <span className="flex items-center gap-1.5 text-sm text-error">
              <Icon name="error" size={18} /> {errorMsg}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function ImageField({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `hero/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      setUrl(data.publicUrl);
    } catch (err) {
      setUploadError("Upload failed. Make sure the 'site-assets' bucket exists in Supabase Storage.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={url} />
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://... (paste image URL or upload below)"
        className="w-full rounded-md border border-line bg-cream px-3.5 py-2.5 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
      />
      {url && (
        <img
          src={url}
          alt="Preview"
          className="h-32 w-full rounded-md border border-line object-cover"
          onError={() => {}}
        />
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-medium text-navy hover:bg-surface-gray disabled:opacity-60"
        >
          {uploading ? (
            <><Icon name="progress_activity" size={16} className="animate-spin" /> Uploading…</>
          ) : (
            <><Icon name="upload" size={16} /> Upload image</>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        {uploadError && <p className="text-xs text-error">{uploadError}</p>}
        {!uploadError && (
          <p className="text-xs text-slate">
            Requires a public <strong>site-assets</strong> bucket in Supabase Storage.
          </p>
        )}
      </div>
    </div>
  );
}
