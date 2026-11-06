export function canAnimate(element: HTMLElement | null): element is HTMLElement {
  if (!element || typeof element.animate !== "function") return false;
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
