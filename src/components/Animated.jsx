import { useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReduced } from "../lib/motion";

// Number that tweens from its previous value to the new one.
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString("en-IN"), duration = 1.2 }) {
  const ref = useRef(null);
  const last = useRef(0);
  useEffect(() => {
    const obj = { v: last.current };
    const tween = gsap.to(obj, {
      v: value || 0,
      duration: prefersReduced() ? 0 : duration,
      ease: "power3.out",
      onUpdate: () => {
        last.current = obj.v;
        if (ref.current) ref.current.textContent = format(obj.v);
      },
    });
    return () => tween.kill();
  }, [value, format, duration]);
  return <span ref={ref}>{format(0)}</span>;
}
