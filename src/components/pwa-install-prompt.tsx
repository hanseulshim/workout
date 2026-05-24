"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("pwa-install-dismissed") !== null
  );
  const [isIos] = useState(
    () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent)
  );
  const [isStandalone] = useState(
    () =>
      typeof window !== "undefined" && (
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
      )
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function handleDismiss() {
    localStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
    setPrompt(null);
  }

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setPrompt(null);
  }

  if (isStandalone || dismissed) return null;

  // Android / Chrome: native install prompt available
  if (prompt) {
    return (
      <Card className="mx-4 mb-2 border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Install App</p>
              <p className="text-xs text-muted-foreground">Add to home screen for the best experience</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={handleInstall}>Install</Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // iOS Safari: manual instructions
  if (isIos) {
    return (
      <Card className="mx-4 mb-2 border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Tap <strong>Share</strong> then <strong>Add to Home Screen</strong> to install
            </p>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
