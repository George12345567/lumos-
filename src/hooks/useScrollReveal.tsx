import { useEffect } from "react";

export const useScrollReveal = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
            entry.target.classList.add("animate-fade-in-up");
            // Unobserve after reveal for better performance
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    const observed = new WeakSet<Element>();
    const observeReveals = () => {
      document.querySelectorAll(".reveal:not(.active)").forEach((reveal) => {
        if (!observed.has(reveal)) {
          observed.add(reveal);
          observer.observe(reveal);
        }
      });
    };

    observeReveals();

    const mutationObserver = new MutationObserver(observeReveals);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, []);
};
