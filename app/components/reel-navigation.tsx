"use client";

import {
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type ReelNavigationProps = {
  previousReelId: string | null;
  nextReelId: string | null;
  children: ReactNode;
};

export default function ReelNavigation({
  previousReelId,
  nextReelId,
  children,
}: ReelNavigationProps) {
  const router = useRouter();

  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const navigating = useRef(false);

  const [isNavigating, setIsNavigating] =
    useState(false);
  const [direction, setDirection] = useState<
    "next" | "previous" | null
  >(null);

  function navigate(
    reelId: string | null,
    navigationDirection: "next" | "previous"
  ) {
    if (!reelId || navigating.current) {
      return;
    }

    navigating.current = true;

    setDirection(navigationDirection);
    setIsNavigating(true);

    router.push(`/reels/${reelId}`);

    window.setTimeout(() => {
      navigating.current = false;
      setIsNavigating(false);
      setDirection(null);
    }, 700);
  }

  useEffect(() => {
    function handleWheel(event: WheelEvent) {
      if (Math.abs(event.deltaY) < 40) {
        return;
      }

      if (navigating.current) {
        return;
      }

      if (event.deltaY > 0) {
        navigate(nextReelId, "next");
      } else {
        navigate(previousReelId, "previous");
      }
    }

    function handleTouchStart(event: TouchEvent) {
      const touch = event.touches[0];

      if (!touch) {
        return;
      }

      touchStartY.current = touch.clientY;
      touchStartX.current = touch.clientX;
    }

    function handleTouchEnd(event: TouchEvent) {
      if (
        touchStartY.current === null ||
        touchStartX.current === null
      ) {
        return;
      }

      const touch = event.changedTouches[0];

      if (!touch) {
        return;
      }

      const deltaY =
        touch.clientY - touchStartY.current;

      const deltaX =
        touch.clientX - touchStartX.current;

      touchStartY.current = null;
      touchStartX.current = null;

      if (Math.abs(deltaY) < 60) {
        return;
      }

      if (Math.abs(deltaY) <= Math.abs(deltaX)) {
        return;
      }

      if (navigating.current) {
        return;
      }

      if (deltaY < 0) {
        navigate(nextReelId, "next");
      } else {
        navigate(previousReelId, "previous");
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (
        event.key === "ArrowDown" ||
        event.key === "PageDown"
      ) {
        event.preventDefault();
        navigate(nextReelId, "next");
      }

      if (
        event.key === "ArrowUp" ||
        event.key === "PageUp"
      ) {
        event.preventDefault();
        navigate(previousReelId, "previous");
      }
    }

    window.addEventListener(
      "wheel",
      handleWheel,
      { passive: true }
    );

    window.addEventListener(
      "touchstart",
      handleTouchStart,
      { passive: true }
    );

    window.addEventListener(
      "touchend",
      handleTouchEnd,
      { passive: true }
    );

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "wheel",
        handleWheel
      );

      window.removeEventListener(
        "touchstart",
        handleTouchStart
      );

      window.removeEventListener(
        "touchend",
        handleTouchEnd
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [nextReelId, previousReelId, router]);

  return (
    <div className="relative min-h-screen overflow-hidden touch-pan-y">
      {/* Navigation transition */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-50 bg-[#111614] transition-opacity duration-300 ${
          isNavigating
            ? "opacity-30"
            : "opacity-0"
        }`}
      />

      {/* Direction indicator */}
      {isNavigating && direction && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-1/2 top-1/2 z-[60] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/50 text-xl text-white backdrop-blur-md">
            {direction === "next" ? "↓" : "↑"}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}