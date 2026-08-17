import { Toaster as Sonner } from 'sonner';

/** Toast host. Place once near the app root. */
export function Toaster() {
  return <Sonner position="top-right" richColors closeButton toastOptions={{ duration: 2500 }} />;
}

export { toast } from 'sonner';
