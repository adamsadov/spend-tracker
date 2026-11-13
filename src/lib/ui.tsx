"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { Transaction } from "./types";

/*
 * Short-lived UI state (the add/edit dialog and the toast), kept apart from the
 * data store on purpose: opening the dialog or showing a toast must not
 * re-render every chart and transaction row behind it.
 *
 * Actions live in their own context whose value never changes, so components
 * that only *open* the dialog never re-render because of it.
 */

export interface ToastState {
  id: number;
  message: string;
  undo?: () => void;
}

export interface EditorState {
  open: boolean;
  editing: Transaction | null;
}

interface UIActions {
  openEditor: (tx?: Transaction) => void;
  closeEditor: () => void;
  showToast: (message: string, undo?: () => void) => void;
  dismissToast: () => void;
}

const ActionsContext = createContext<UIActions | null>(null);
const EditorContext = createContext<EditorState>({ open: false, editing: null });
const ToastContext = createContext<ToastState | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [editor, setEditor] = useState<EditorState>({ open: false, editing: null });
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, undo?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, undo });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const openEditor = useCallback((tx?: Transaction) => setEditor({ open: true, editing: tx ?? null }), []);
  const closeEditor = useCallback(() => setEditor((e) => ({ ...e, open: false })), []);

  const actions = useMemo(
    () => ({ openEditor, closeEditor, showToast, dismissToast }),
    [openEditor, closeEditor, showToast, dismissToast],
  );

  return (
    <ActionsContext.Provider value={actions}>
      <EditorContext.Provider value={editor}>
        <ToastContext.Provider value={toast}>{children}</ToastContext.Provider>
      </EditorContext.Provider>
    </ActionsContext.Provider>
  );
}

export function useUIActions(): UIActions {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error("useUIActions must be used inside <UIProvider>");
  return ctx;
}

export const useEditorState = () => useContext(EditorContext);
export const useToastState = () => useContext(ToastContext);
