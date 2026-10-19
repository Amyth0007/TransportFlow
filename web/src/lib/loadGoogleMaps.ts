declare global {
  interface Window {
    initGoogleMapsCallback?: () => void;
    google: any;
  }
}

let isLoaded = false;
let loadPromise: Promise<void> | null = null;

/** Single Maps JS load for map + Places Autocomplete (India search). */
export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window !== 'undefined' && window.google?.maps?.places) {
    isLoaded = true;
    return Promise.resolve();
  }
  if (isLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const callbackName = 'initGoogleMapsCallback';
    window[callbackName] = () => {
      isLoaded = true;
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });

  return loadPromise;
}
