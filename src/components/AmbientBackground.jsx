import { useEffect, useRef } from "react";

export default function AmbientBackground() {
  const blob1 = useRef(null);
  const blob2 = useRef(null);
  const blob3 = useRef(null);

  useEffect(() => {
    let raf = null;
    let targetX = 0, targetY = 0;
    let curX = 0, curY = 0;

    function onMove(e) {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2; // -1..1
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    function tick() {
      // ease toward the target so it feels smooth, not jittery
      curX += (targetX - curX) * 0.04;
      curY += (targetY - curY) * 0.04;
      if (blob1.current) blob1.current.style.setProperty("--px", `${curX * 30}px`), blob1.current.style.setProperty("--py", `${curY * 20}px`);
      if (blob2.current) blob2.current.style.setProperty("--px", `${curX * -22}px`), blob2.current.style.setProperty("--py", `${curY * 26}px`);
      if (blob3.current) blob3.current.style.setProperty("--px", `${curX * 18}px`), blob3.current.style.setProperty("--py", `${curY * -24}px`);
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-circle-bg">
      <div
        ref={blob1}
        className="absolute w-[38rem] h-[38rem] rounded-full opacity-30 blur-3xl animate-drift-slow"
        style={{
          background: "radial-gradient(circle, #1B3A5C 0%, transparent 70%)",
          top: "-10%", left: "-10%",
          translate: "var(--px, 0) var(--py, 0)",
          transition: "translate 0.1s linear",
        }}
      />
      <div
        ref={blob2}
        className="absolute w-[34rem] h-[34rem] rounded-full opacity-25 blur-3xl animate-drift-medium"
        style={{
          background: "radial-gradient(circle, #A6812E 0%, transparent 70%)",
          top: "20%", right: "-12%",
          translate: "var(--px, 0) var(--py, 0)",
          transition: "translate 0.1s linear",
        }}
      />
      <div
        ref={blob3}
        className="absolute w-[30rem] h-[30rem] rounded-full opacity-20 blur-3xl animate-drift-fast"
        style={{
          background: "radial-gradient(circle, #1F5C4E 0%, transparent 70%)",
          bottom: "-15%", left: "20%",
          translate: "var(--px, 0) var(--py, 0)",
          transition: "translate 0.1s linear",
        }}
      />
    </div>
  );
}
