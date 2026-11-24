import { useEffect, type RefObject } from 'react';

export function useScrollIntoView(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [ref, active]);
}
