"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScreenHeader } from "@/components/shell/screenheader";
import { Mail, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DataDeletionScreen() {
  const router = useRouter();
  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-[640px]">
        <ScreenHeader title="Delete your data" onBack={() => router.back()} />
        <div className="px-5 pt-4 pb-10">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                <Trash2 className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-semibold text-ink">Request data deletion</p>
                <p className="mt-1 text-[14px] leading-6 text-ink3">
                  To delete your account and shop data from our cloud, send an email to
                  support@scalmint.com from the address linked to your account. We remove your
                  shop data from our cloud within 30 days and confirm by email.
                </p>
                <p className="mt-2 text-[14px] leading-6 text-ink3">
                  Data stored only on your device (offline shops) is removed by uninstalling the
                  app or clearing the app's storage in Android settings.
                </p>
              </div>
            </div>
            <Button
              className="mt-4"
              block
              onClick={() => {
                window.location.href = "mailto:support@scalmint.com?subject=Data%20deletion%20request";
              }}
              icon={<Mail className="size-[18px]" />}
            >
              Email support@scalmint.com
            </Button>
          </Card>
          <p className="mt-4 text-[13px] text-ink3">
            Hosted request page: https://pos.scalmint.com/data-deletion
          </p>
        </div>
      </div>
    </div>
  );
}
