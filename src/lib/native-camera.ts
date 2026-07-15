type NativeCameraPermissionEvent = CustomEvent<{ granted?: boolean }>;

export async function requestNativeCameraPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const nativeBridge = (window as typeof window & {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }).ReactNativeWebView;

  if (!nativeBridge) return true;

  return new Promise(resolve => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener('lista-native-camera-permission', handlePermission as EventListener);
      resolve(false);
    }, 15000);

    const handlePermission = (event: Event) => {
      window.clearTimeout(timeout);
      window.removeEventListener('lista-native-camera-permission', handlePermission as EventListener);
      resolve(Boolean((event as NativeCameraPermissionEvent).detail?.granted));
    };

    window.addEventListener('lista-native-camera-permission', handlePermission as EventListener, { once: true });
    nativeBridge.postMessage(JSON.stringify({ type: 'lista-request-camera-permission' }));
  });
}
