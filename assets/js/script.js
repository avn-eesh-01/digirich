const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

if (menuToggle && navMenu) {
  menuToggle.addEventListener("click", () => {
    navMenu.classList.toggle("open");
  });
}

const visual = document.querySelector(".hero-visual");
const shadow = document.querySelector(".hero-shadow");
const orbitCore = document.querySelector(".orbit-core");
const gsapLib = window.gsap;

if (visual && orbitCore && gsapLib) {
  const coins = gsapLib.utils.toArray(".hero-coin");
  const orbitRings = gsapLib.utils.toArray(".orbit-ring");

  if (coins.length) {
    gsapLib.set(visual, { transformPerspective: 1200 });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const TAU = Math.PI * 2;
    const orbitRotation = -0.72;
    let orbitCenter = { x: 0, y: 0 };
    let viewportScale = 1;

    const syncOrbitCenter = () => {
      const visualRect = visual.getBoundingClientRect();
      const coreRect = orbitCore.getBoundingClientRect();

      orbitCenter = {
        x: coreRect.left - visualRect.left + coreRect.width / 2,
        y: coreRect.top - visualRect.top + coreRect.height / 2
      };
      viewportScale = Math.min(1, visualRect.width / 680);

      gsapLib.set(coins, {
        left: orbitCenter.x,
        top: orbitCenter.y,
        xPercent: -50,
        yPercent: -50
      });
    };

    const orbitalBodies = coins.map((coin, index) => ({
      coin,
      phase: (index / coins.length) * TAU,
      radiusX: 172 + (index % 4) * 30,
      radiusY: 126 + (index % 3) * 28,
      depth: 96 + (index % 5) * 16,
      speed: 0.3 + (index % 3) * 0.045,
      spin: 0.9 + index * 0.08,
      wobble: index * 0.55
    }));

    syncOrbitCenter();
    window.addEventListener("resize", syncOrbitCenter);

    const positionCoin = (body, time) => {
      const angle = body.phase + time * body.speed;
      const localX = Math.cos(angle) * body.radiusX * viewportScale;
      const localY = Math.sin(angle) * body.radiusY * viewportScale;
      const rotatedX = localX * Math.cos(orbitRotation) - localY * Math.sin(orbitRotation);
      const rotatedY = localX * Math.sin(orbitRotation) + localY * Math.cos(orbitRotation);
      const planeTilt = 0.68;
      const yaw = -0.26;

      const x = rotatedX + rotatedY * yaw;
      const y = rotatedY * planeTilt + Math.sin(angle * 2 + body.wobble) * 12 * viewportScale;
      const z =
        Math.sin(angle) * body.depth * viewportScale +
        rotatedX * 0.08 +
        Math.cos(angle * 2 + body.wobble) * 20 * viewportScale;
      const tangent = angle + Math.PI / 2;
      const depthScale = gsapLib.utils.mapRange(-120, 120, 0.74, 1.16, z);
      const lightOpacity = gsapLib.utils.mapRange(-120, 120, 0.58, 1, z);
      const gleam = gsapLib.utils.mapRange(-120, 120, 0.86, 1.22, z);

      gsapLib.set(body.coin, {
        x,
        y,
        z,
        scale: depthScale,
        rotateX: 68 - Math.cos(angle) * 18,
        rotateY: -34 + Math.sin(angle + body.wobble) * 34,
        rotateZ: tangent * (180 / Math.PI) + Math.sin(time * body.spin) * 10,
        opacity: lightOpacity,
        zIndex: Math.round(500 + z),
        filter: `brightness(${gleam}) saturate(${0.92 + gleam * 0.12})`,
        transformOrigin: "50% 50% -16"
      });
    };

    if (reduceMotion) {
      orbitalBodies.forEach((body) => positionCoin(body, 0));
    } else {
      orbitalBodies.forEach((body) => positionCoin(body, 0));
      gsapLib.ticker.add(() => {
        const t = gsapLib.ticker.time * 1.05;
        orbitalBodies.forEach((body) => positionCoin(body, t));
      });
    }

    orbitRings.forEach((ring, index) => {
      gsapLib.to(ring, {
        rotateZ: 360,
        duration: 26 + index * 8,
        repeat: -1,
        ease: "none"
      });
    });

    if (shadow) {
      gsapLib.to(shadow, {
        scaleX: 1.34,
        scaleY: 0.72,
        opacity: 0.3,
        duration: 4.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }

    if (!reduceMotion) {
      const rotateRange = 9;
      const moveRange = 14;

      visual.addEventListener("pointermove", (event) => {
        const rect = visual.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;

        gsapLib.to(visual, {
          rotateY: px * rotateRange,
          rotateX: py * -rotateRange - 3,
          x: px * moveRange,
          y: py * moveRange,
          duration: 0.6,
          ease: "power2.out"
        });
      });

      visual.addEventListener("pointerleave", () => {
        gsapLib.to(visual, {
          rotateY: 0,
          rotateX: -3,
          x: 0,
          y: 0,
          duration: 0.9,
          ease: "power3.out"
        });
      });

      gsapLib.set(visual, { rotateX: -3 });
    }
  }
}

const revealItems = document.querySelectorAll(".reveal");

if (revealItems.length) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -40px 0px" }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}
