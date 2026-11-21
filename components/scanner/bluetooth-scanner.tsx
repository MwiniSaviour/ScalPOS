"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { listPaired, type PrinterDevice } from "@/lib/bluetooth";
import {
  connectHid,
  disconnectHid,
  getSavedDesktop,
  hidAvailable,
  hidState,
  hidSupported,
  onHidStateChange,
  registerHid,
  saveDesktop,
  type HidState,
} from "@/lib/bluetooth-hid";
import { usePos } from "@/lib/store";
import { Bluetooth } from "lucide-react";

const emptyState: HidState = {
  supported: false,
  registered: false,
  connected: false,
  name: null,
};

export function BluetoothScannerSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = usePos((s) => s.toast);
  const [state, setState] = useState<HidState>(emptyState);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void (async () => {
      try {
        const [supported, current, paired] = await Promise.all([
          hidSupported(),
          hidState(),
          hidAvailable() ? listPaired() : Promise.resolve([]),
        ]);
        if (!alive) return;
        setState({ ...current, supported });
        setDevices(paired);
      } catch {
        if (alive) toast("Bluetooth is not available", "error");
      }
    })();
    let listener: { remove: () => void } | undefined;
    void onHidStateChange((next) => {
      if (alive) setState((prev) => ({ ...prev, ...next }));
    }).then((l) => {
      if (alive) listener = l;
      else l.remove();
    });
    return () => {
      alive = false;
      listener?.remove();
    };
  }, [open, toast]);

  const register = async () => {
    setBusy(true);
    try {
      await registerHid();
      setState(await hidState());
      toast("Bluetooth keyboard ready to pair", "ok");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not register", "error");
    } finally {
      setBusy(false);
    }
  };

  const connect = async (device: PrinterDevice) => {
    setBusy(true);
    try {
      await connectHid(device.address);
      saveDesktop(device);
      setState(await hidState());
      toast(`Connected to ${device.name}`, "ok");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not connect", "error");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await disconnectHid();
      setState(await hidState());
    } catch {
      toast("Could not disconnect", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Bluetooth scanner" height="auto">
      <div className="px-5 pb-6">
        <p className="text-[14px] leading-relaxed text-ink3">
          Pair this phone with a computer as a barcode keyboard. Scanned codes are
          typed straight into the open sale — no internet needed. Hardware scanners
          keep working as before.
        </p>

        <div className="mt-3 rounded-xl border border-line2 bg-surface2 px-3.5 py-3 text-[14px]">
          <div className="flex items-center gap-2 font-medium text-ink">
            <Bluetooth className="size-[17px]" />
            {state.connected
              ? `Connected to ${state.name ?? "desktop"}`
              : state.registered
                ? "Registered — waiting for a computer"
                : state.supported
                  ? "Not registered yet"
                  : "Android 9+ required"}
          </div>
          <p className="mt-1 text-[13px] text-ink3">
            {state.connected
              ? "Scan a barcode on the Sell screen and it will be typed into the computer."
              : "Register, then pair the phone from the computer's Bluetooth settings."}
          </p>
        </div>

        {!state.registered && state.supported && (
          <Button
            className="mt-3"
            block
            loading={busy}
            onClick={() => void register()}
          >
            Register Bluetooth keyboard
          </Button>
        )}

        {state.registered && !state.connected && (
          <div className="mt-3">
            <p className="mb-2 text-[13px] font-medium text-ink2">Paired devices</p>
            {devices.length === 0 ? (
              <p className="text-[13px] text-ink3">
                No paired devices found. Pair the computer first.
              </p>
            ) : (
              <div className="space-y-2">
                {devices.map((d) => (
                  <button
                    key={d.address}
                    onClick={() => void connect(d)}
                    disabled={busy}
                    className="flex w-full items-center justify-between rounded-xl border border-line2 bg-surface px-3.5 py-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-ink">
                        {d.name}
                      </span>
                      <span className="block truncate text-[12px] text-ink3">
                        {d.address}
                      </span>
                    </span>
                    <span className="text-[13px] font-semibold text-accent">Connect</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {state.connected && (
          <Button
            className="mt-3"
            variant="secondary"
            block
            loading={busy}
            onClick={() => void disconnect()}
          >
            Disconnect
          </Button>
        )}

        {getSavedDesktop() && !state.connected && state.registered && (
          <p className="mt-2 text-[12px] text-ink3">
            Last computer: {getSavedDesktop()?.name}
          </p>
        )}
      </div>
    </Sheet>
  );
}
