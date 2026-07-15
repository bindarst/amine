import type { IScannerControls } from '@zxing/browser';
import { requestNativeCameraPermission } from '@/lib/native-camera';

export async function startBarcodeCamera(
  video: HTMLVideoElement,
  onDetected: (value: string) => void
): Promise<IScannerControls> {
  const permissionGranted = await requestNativeCameraPermission();
  if (!permissionGranted) {
    throw new Error("L'autorisation de la camera a ete refusee. Autorisez-la dans les parametres de l'application.");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("La camera n'est pas disponible sur cet appareil.");
  }

  const { BrowserMultiFormatReader } = await import('@zxing/browser');
  const reader = new BrowserMultiFormatReader(undefined, {
    delayBetweenScanAttempts: 250,
    delayBetweenScanSuccess: 500,
  });

  return reader.decodeFromConstraints(
    {
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    video,
    (result, _error, controls) => {
      const value = result?.getText().trim();
      if (!value) return;
      controls.stop();
      onDetected(value);
    }
  );
}
