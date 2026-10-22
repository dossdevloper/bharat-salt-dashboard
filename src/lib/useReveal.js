import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReduced } from "./motion";

// Staggers `.reveal` children in whenever `deps` change (view / range switch).
export function useReveal(deps) {
  const scope = useRef(null);
  useLayoutEffect(() => {
    if (!scope.current || prefersReduced()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".reveal",
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", stagger: 0.05, clearProps: "transform" },
      );
      gsap.fromTo(
        "[data-grow]",
        { scaleX: 0 },
        { scaleX: 1, transformOrigin: "left center", duration: 1, ease: "expo.out", stagger: 0.03, delay: 0.2 },
      );
    }, scope);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return scope;
}
