import { useEffect, useRef } from 'react';

type ElementRef = { current: HTMLElement | null };

export function useDismissOnOutside(open: boolean, refs: readonly ElementRef[], onDismiss: () => void) {
  const refsRef = useRef(refs);
  const onDismissRef = useRef(onDismiss);
  refsRef.current = refs;
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (refsRef.current.some(ref => ref.current?.contains(event.target as Node))) return;
      onDismissRef.current();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismissRef.current();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);
}
