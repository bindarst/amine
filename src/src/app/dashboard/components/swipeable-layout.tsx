
'use client';

import * as React from 'react';

// This component is now a pass-through and does not implement swiping.
// The swipe functionality has been disabled as per user request.
export function SwipeableLayout({
  children,
  currentUserRole
}: {
  children: React.ReactNode;
  currentUserRole: string | undefined;
}) {
  return <>{children}</>;
}
