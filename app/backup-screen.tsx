"use client";

import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import {
  BACKUP_FILENAME,
  DriveAuthError,
  applyRestore,
  buildBackup,
  builtinClientId,
  clientId,
  clearDriveToken,
  connectDrive,
  currentSchemaVersion,
  downloadDriveBackup,
  findDriveBackup,
  getDriveToken,
  lastBackupAt,
  localImageRefs,
  markBackupDone,
  parseBackupText,
  saveBackupFile,
  saveClientId,
  uploadDriveBackup,
  type BackupPreview,
} from "@/lib/backup";
import { dateLong, dateShort, timeOf } from "@/lib/format";
import { useNet } from "@/lib/net";
import { usePos, useSettings } from "@/lib/store";
import { cn } from "@/lib/ui";
import { ChevronLeft, CloudUpload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";

type Busy = "driveSave" | "device" | "driveRestore" | "restore" | "connect" | null;
type Goal = "save" | "restore";

/* Google Drive backup is temporarily withdrawn from the product (the OAuth
   round-trip is not behaving on-device). The email/file options stay. Flip
   this back to true, or restore this screen from git history, to re-feature. */
const DRIVE_ENABLED = false;

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}

const noopSubscribe = () => () => {};

/** localStorage-backed value, read purity-safe (server render never touches storage). */
function useClientValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, read, () => serverValue);
}

export default function BackupScreen() {
  const router = useRouter();
  const toast = usePos((s) => s.toast);
  const products = usePos((s) => s.products);
  const orders = usePos((s) => s.orders);
  const customers = usePos((s) => s.customers);
  const settings = useSettings();
  const { online } = useNet();

  const marker = useClientValue(lastBackupAt, 0);
  const currentVersion = useClientValue(currentSchemaVersion, 0);
  const storedCid = useClientValue(clientId, "");
  const origin = useClientValue(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    "",
  );
  /** baked at build time — owners never see Google Cloud Console */
  const builtinCid = builtinClientId();
  const [cidEdit, setCidEdit] = useState<string | null>(null);
  const [cidError, setCidError] = useState("");
  const [includePhotos, setIncludePhotos] = useState(true);
  const [busy, setBusy] = useState<Busy>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [afterConnect, setAfterConnect] = useState<Goal>("save");
  const fileRef = useRef<HTMLInputElement>(null);

  const localPhotos = useMemo(() => localImageRefs({ products, orders }).length, [products, orders]);
  const incompatible = !!preview && preview.schemaVersion > currentVersion;
  const cid = cidEdit ?? (builtinCid ? "" : storedCid);

  /* --------------------------------- back up -------------------------------- */

  const runDriveSave = async () => {
    setBusy("driveSave");
    try {
      const built = await buildBackup(includePhotos);
      await uploadDriveBackup(built.json);
      markBackupDone();
      toast(
        built.skipped ? "Large backup — photo export skipped" : "Backup saved to Google Drive",
        built.skipped ? "warn" : "ok",
      );
    } catch (e) {
      if (e instanceof DriveAuthError) {
        clearDriveToken();
        setAfterConnect("save");
        setConnectOpen(true);
        setCidError(e.message);
      } else {
        toast(errorText(e), "error");
      }
    } finally {
      setBusy(null);
    }
  };

  const saveToDevice = async () => {
    setBusy("device");
    try {
      const built = await buildBackup(includePhotos);
      const how = await saveBackupFile(built.json);
      markBackupDone();
      if (built.skipped) toast("Large backup — photo export skipped", "warn");
      else
        toast(
          how === "shared" ? "Copy saved — pick Drive or Files to keep it" : "Backup downloaded",
          "ok",
        );
    } catch (e) {
      toast(errorText(e), "error");
    } finally {
      setBusy(null);
    }
  };

  /* --------------------------------- restore -------------------------------- */

  const runDriveRestore = async () => {
    setBusy("driveRestore");
    try {
      const file = await findDriveBackup();
      if (!file) {
        toast(`No ${BACKUP_FILENAME} in this Drive yet — make a backup first`, "warn");
        return;
      }
      const text = await downloadDriveBackup(file.id);
      setPreview(parseBackupText(text));
    } catch (e) {
      if (e instanceof DriveAuthError) {
        clearDriveToken();
        setAfterConnect("restore");
        setConnectOpen(true);
        setCidError(e.message);
      } else {
        toast(errorText(e), "error");
      }
    } finally {
      setBusy(null);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      setPreview(parseBackupText(text));
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  const restoreNow = async (p: BackupPreview) => {
    setBusy("restore");
    try {
      await applyRestore(p); // reloads the app on success
    } catch (e) {
      toast(errorText(e), "error");
      setBusy(null);
    }
  };

  /* ------------------------------ drive connect ----------------------------- */

  const startDrive = (goal: Goal) => {
    if (!online) return;
    if (getDriveToken()) {
      void (goal === "save" ? runDriveSave() : runDriveRestore());
      return;
    }
    setAfterConnect(goal);
    setCidError("");
    setConnectOpen(true);
  };

  const connectNow = async () => {
    if (!builtinCid) {
      const value = cid.trim();
      if (!value) {
        setCidError("Paste a Google web client ID first");
        return;
      }
      saveClientId(value);
    }
    setBusy("connect");
    try {
      await connectDrive();
      setCidError("");
      setCidEdit(null);
      setConnectOpen(false);
      if (afterConnect === "save") await runDriveSave();
      else await runDriveRestore();
    } catch (e) {
      setCidError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  /* ---------------------------------- view ---------------------------------- */

  const previewRows: Array<[string, string]> = preview
    ? [
        ["Products", String(preview.counts.products)],
        ["Orders", String(preview.counts.orders)],
        ["Customers", String(preview.counts.customers)],
        ["Photos", preview.imagesIncluded ? String(preview.counts.photos) : "Not included"],
        [
          "Created",
          preview.createdAtMs ? `${dateShort(preview.createdAtMs)} · ${timeOf(preview.createdAtMs)}` : "Unknown",
        ],
        ["Schema version", `v${preview.schemaVersion} (this register: v${currentVersion})`],
      ]
    : [];

  return (
    <div className="anim-fade px-5 pt-4 pb-10">
      <header className="flex items-center gap-1">
        <IconButton label="Back" onClick={() => router.back()} className="-ml-2 shrink-0 text-ink">
          <ChevronLeft className="size-[24px]" strokeWidth={2.2} />
        </IconButton>
        <h1 className="min-w-0 flex-1 truncate text-[26px]/7 font-bold tracking-[-0.02em] text-ink">
          Backup &amp; recovery
        </h1>
      </header>
      <p className="mt-0.5 text-[15px] text-ink3">Save a copy on this device</p>

      {/* status */}
      <Card className="mt-5 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-ink2">
            <CloudUpload className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-semibold text-ink">Last backup</div>
            <div
              className={cn("truncate text-[14px]", marker ? "text-ink3" : "text-warn")}
            >
              {marker
                ? `${settings.shopName ? `${settings.shopName} · ` : ""}${dateLong(marker)} · ${timeOf(marker)}`
                : "No backup yet"}
            </div>
          </div>
        </div>
        <div className="mt-3 border-t border-line pt-3 text-[14px] leading-5 text-ink2">
          {products.length} products · {orders.length} orders · {customers.length} customers ·{" "}
          {localPhotos} photo{localPhotos === 1 ? "" : "s"} on this device
        </div>
      </Card>

      {/* make a backup */}
      <section className="mt-6">
        <h2 className="text-[15px] font-medium text-ink2">Make a backup</h2>
        <div className="mt-2.5 grid gap-2.5">
          {DRIVE_ENABLED && (
            <Button
              size="lg"
              block
              loading={busy === "driveSave" || busy === "connect"}
              disabled={busy !== null || !online}
              onClick={() => startDrive("save")}
            >
              Back up to Google Drive
            </Button>
          )}
          <Button
            size="lg"
            block
            variant={DRIVE_ENABLED ? "secondary" : "primary"}
            loading={busy === "device"}
            disabled={busy !== null}
            onClick={() => void saveToDevice()}
          >
            Save copy to device
          </Button>
        </div>
        {!online && DRIVE_ENABLED && (
          <p className="mt-2.5 text-[14px] leading-5 text-ink3">
            You&rsquo;re offline — cloud backup is unavailable. Local save still works.
          </p>
        )}

        {/* photo export */}
        <Card className="mt-3 p-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-semibold text-ink">Product photos</div>
              <div className="text-[14px] text-ink3">Stored inside the backup file</div>
            </div>
          </div>
          <Segmented
            className="mt-3"
            value={includePhotos ? "on" : "off"}
            onChange={(v) => setIncludePhotos(v === "on")}
            options={[
              { value: "off", label: "Off" },
              { value: "on", label: "On" },
            ]}
          />
          <p className="mt-2.5 text-[14px] leading-5 text-ink3">
            {includePhotos
              ? "Photos travel with the backup — past about 10 MB the copy skips photos instead."
              : "The backup holds data only and stays small — photos are left out."}
          </p>
        </Card>
      </section>

      {/* restore */}
      <section className="mt-6">
        <h2 className="text-[15px] font-medium text-ink2">Restore</h2>
        <Card inset className="mt-2.5">
          {DRIVE_ENABLED && (
            <button
              type="button"
              disabled={busy !== null || !online}
              onClick={() => startDrive("restore")}
              className="press w-full px-4 py-3.5 text-left hover:bg-surface2/50 disabled:opacity-45"
            >
              <span className="block text-[17px] font-semibold text-ink">Restore from Google Drive</span>
              <span className="block text-[14px] text-ink3">
                Downloads {BACKUP_FILENAME} from your Drive — adds nothing to your register until
                you confirm
              </span>
            </button>
          )}
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => fileRef.current?.click()}
            className="press w-full px-4 py-3.5 text-left hover:bg-surface2/50 disabled:opacity-45"
          >
            <span className="block text-[17px] font-semibold text-ink">Restore from a file</span>
            <span className="block text-[14px] text-ink3">
              Pick a {BACKUP_FILENAME} you saved earlier — photos and all
            </span>
          </button>
        </Card>
        <p className="mt-2.5 text-[14px] leading-5 text-ink3">
          Restoring replaces everything currently in this register — review the summary the file
          gives you before it applies.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={onPickFile}
        />
      </section>

      {/* preview — shown after a backup file is parsed */}
      {preview && (
        <section className="anim-fade mt-6">
          <h2 className="text-[15px] font-medium text-ink2">Backup summary</h2>
          <Card inset className="mt-2.5">
            {previewRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-[14px] text-ink2">{label}</span>
                <span className="tabnum text-right text-[16px] font-medium text-ink">{value}</span>
              </div>
            ))}
          </Card>
          {incompatible ? (
            <p className="mt-3 text-[14px] leading-5 text-warn">
              This backup was made by a newer version — update ScalPOS, then restore it here.
            </p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <Button variant="secondary" block onClick={() => setPreview(null)}>
                  Cancel
                </Button>
                <Button block loading={busy === "restore"} onClick={() => setConfirmOpen(true)}>
                  Restore backup
                </Button>
              </div>
              <p className="mt-2.5 text-[14px] leading-5 text-ink3">
                The current register is kept until you confirm the restore.
              </p>
            </>
          )}
        </section>
      )}

      {/* final gate */}
      <Confirm
        open={confirmOpen && !!preview && !incompatible}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (preview) void restoreNow(preview);
        }}
        title="Replace this register?"
        body="This replaces everything in this register — export a copy first."
        confirmLabel="Restore"
        tone="danger"
      />

      {/* drive connect */}
      <Sheet
        open={connectOpen && DRIVE_ENABLED}
        onClose={() => setConnectOpen(false)}
        title="Connect Google Drive"
        footer={
          <div className="flex gap-2.5">
            <Button variant="secondary" block onClick={() => setConnectOpen(false)}>
              Cancel
            </Button>
            <Button block loading={busy === "connect"} onClick={() => void connectNow()}>
              {builtinCid ? "Continue" : "Connect"}
            </Button>
          </div>
        }
      >
        <p className="pb-3 text-[14px] leading-6 text-ink2">
          Backups go to one file, <span className="font-semibold text-ink">{BACKUP_FILENAME}</span>,
          in your own Google Drive — no ScalPOS servers involved.
        </p>
        {builtinCid ? (
          <p className="pb-3 text-[14px] leading-6 text-ink3">
            Next, Google shows the account chooser — pick the email your shop should stay saved
            under. Only this one backup file can be seen by the app.
          </p>
        ) : (
          <>
            <p className="pb-3 text-[14px] leading-6 text-ink3">
              Google asks for a web client id (Cloud Console → APIs &amp; Services → Credentials
              → OAuth client id, type Web). Authorise this origin:{" "}
              <span className="font-semibold text-ink">{origin || "this app"}</span>
            </p>
            <Input
              label="Google client ID"
              value={cid}
              onChange={(e) => {
                setCidEdit(e.target.value);
                setCidError("");
              }}
              placeholder="1234567890-abc.apps.googleusercontent.com"
              inputMode="text"
              hint="Kept only on this device"
              error={cidError || undefined}
            />
          </>
        )}
        {builtinCid && cidError && (
          <p className="text-[14px] text-danger">{cidError}</p>
        )}
      </Sheet>
    </div>
  );
}
