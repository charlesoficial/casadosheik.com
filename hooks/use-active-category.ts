import { useEffect, useState } from "react";

export function useActiveCategory(categoryAnchors: string[]) {
  const [activeId, setActiveId] = useState<string>(categoryAnchors[0] ?? "");

  useEffect(() => {
    if (!categoryAnchors.length) return;

    const observers = categoryAnchors.map((anchor) => {
      const el = document.getElementById(`cat-${anchor}`);
      if (!el) return null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(anchor);
        },
        { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
      );
      observer.observe(el);
      return observer;
    });

    return () => observers.forEach((o) => o?.disconnect());
  }, [categoryAnchors]);

  return activeId;
}
