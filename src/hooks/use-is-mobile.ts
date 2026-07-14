
'use client';

import * as React from 'react';

const MOBILE_BREAKPOINT = 768; // md breakpoint in Tailwind

/**
 * Custom hook to determine if the screen is mobile-sized using matchMedia.
 * Returns `true` if the window width is less than 768px, `false` otherwise.
 * It's `undefined` on the server and during initial client render to prevent hydration mismatches.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // matchMedia is a browser-only API
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    // Function to update state based on media query match
    const updateTarget = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    
    // Set the initial state
    setIsMobile(mediaQuery.matches);

    // Add the event listener
    mediaQuery.addEventListener('change', updateTarget);

    // Clean up the event listener on component unmount
    return () => mediaQuery.removeEventListener('change', updateTarget);
  }, []); // Empty dependency array ensures this runs only once on mount

  return isMobile;
}
