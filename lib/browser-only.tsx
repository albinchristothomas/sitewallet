"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isNativeApp } from "@/lib/native";

// Renders its children only when the app is running in a browser tab or an
// installed PWA, not inside the native App Store / Play Store shell. Used for
// advice that makes no sense in the native app ("Add to Home Screen").
// Renders nothing until mounted so server and client markup match.
export function BrowserOnly({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(!isNativeApp());
  }, []);
  return show ? <>{children}</> : null;
}
