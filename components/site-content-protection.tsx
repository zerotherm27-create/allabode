"use client";

import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest("input, textarea, select, [contenteditable='true']");
}

function shouldBlockShortcut(event: KeyboardEvent) {
  const key = event.key.toLowerCase();
  const command = event.metaKey || event.ctrlKey;

  return (
    key === "printscreen" ||
    (command && ["p", "s", "u"].includes(key)) ||
    (command && event.shiftKey && ["i", "j", "c"].includes(key)) ||
    key === "f12"
  );
}

export function SiteContentProtection() {
  useEffect(() => {
    const prevent = (event: Event) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    const preventImageDrag = (event: DragEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("img, picture")) {
        event.preventDefault();
      }
    };

    const preventShortcuts = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (!shouldBlockShortcut(event)) return;
      event.preventDefault();
    };

    window.addEventListener("contextmenu", prevent);
    window.addEventListener("dragstart", preventImageDrag);
    window.addEventListener("copy", prevent);
    window.addEventListener("cut", prevent);
    window.addEventListener("keydown", preventShortcuts);

    return () => {
      window.removeEventListener("contextmenu", prevent);
      window.removeEventListener("dragstart", preventImageDrag);
      window.removeEventListener("copy", prevent);
      window.removeEventListener("cut", prevent);
      window.removeEventListener("keydown", preventShortcuts);
    };
  }, []);

  return null;
}
