import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";

/** Mounts all PWA runtime UI: offline banner, install prompt, update prompt.
 *  Registering the service worker happens inside `UpdatePrompt`. */
export function PwaManager() {
  return (
    <>
      <OfflineIndicator />
      <InstallPrompt />
      <UpdatePrompt />
    </>
  );
}
