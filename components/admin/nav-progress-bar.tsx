"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function NavProgressBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const prevRef = useRef(pathname);
  const fakeTimer = useRef<ReturnType<typeof setInterval>>();
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  function start() {
    clearTimeout(hideTimer.current);
    clearInterval(fakeTimer.current);
    setVisible(true);
    setWidth(0);
    requestAnimationFrame(() => {
      setWidth(12);
      fakeTimer.current = setInterval(() => {
        setWidth((w) => {
          if (w >= 80) { clearInterval(fakeTimer.current); return w; }
          return w + (80 - w) * 0.07;
        });
      }, 120);
    });
  }

  function finish() {
    clearInterval(fakeTimer.current);
    setWidth(100);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 300);
  }

  useEffect(() => {
    if (prevRef.current !== pathname) {
      prevRef.current = pathname;
      finish();
    }
  }, [pathname]);

  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const a = (e.target as Element).closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto") || (a as HTMLAnchorElement).target === "_blank") return;
      start();
    }
    document.addEventListener("click", onLinkClick, true);
    return () => document.removeEventListener("click", onLinkClick, true);
  }, []);

  if (!visible) return null;

  return (
    <div style={{ position: "fixed", inset: "0 0 auto 0", height: 2, zIndex: 9999, pointerEvents: "none" }}>
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          background: "var(--admin-primary-bg)",
          transition: width === 100
            ? "width 180ms ease-out, opacity 200ms ease-out 80ms"
            : "width 180ms ease-out",
          opacity: width === 100 ? 0 : 1,
          boxShadow: "0 0 8px 1px var(--admin-primary-bg)",
        }}
      />
    </div>
  );
}
