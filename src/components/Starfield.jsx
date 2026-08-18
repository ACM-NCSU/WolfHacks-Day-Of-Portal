import { useEffect, useRef } from 'react';

const LEAF_COLORS = ['#C97A3D', '#B9532C', '#D9A441', '#A8632E'];

export default function Starfield() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    let dots = [];
    let flecks = [];
    let w = 0;
    let h = 0;
    let frameId = null;
    let t = 0;
    let theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

    function size() {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }

    function makeDots() {
      const density = theme === 'light' ? 13000 : 9000;
      const count = Math.round((w * h) / density);
      dots = [];
      for (let i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.2 + 0.3,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.15 + 0.03,
        });
      }
    }

    function makeFlecks() {
      const count = Math.max(6, Math.round((w * h) / 100000));
      flecks = [];
      for (let i = 0; i < count; i++) {
        flecks.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.6 + 0.8,
          vy: Math.random() * 0.18 + 0.06,
          sway: Math.random() * Math.PI * 2,
          swaySpeed: Math.random() * 0.01 + 0.004,
          swayAmp: Math.random() * 14 + 6,
          alpha: Math.random() * 0.35 + 0.25,
          color: LEAF_COLORS[i % LEAF_COLORS.length],
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.01,
          rw: Math.random() * 3 + 3,
          rh: Math.random() * 1.5 + 1.5,
        });
      }
    }

    function drawStatic() {
      ctx.clearRect(0, 0, w, h);
      const dotColor = theme === 'light' ? '#F0A93B' : '#F5F1E8';
      dots.forEach((s) => {
        ctx.globalAlpha = theme === 'light' ? 0.22 : 0.35;
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function animateDark() {
      dots.forEach((s) => {
        const twinkle = 0.35 + Math.sin(t * s.speed + s.phase) * 0.25;
        ctx.globalAlpha = Math.max(0, twinkle);
        ctx.fillStyle = '#F5F1E8';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(200, 16, 46, 0.6)';
      flecks.forEach((e) => {
        e.y -= e.vy;
        if (e.y < -10) {
          e.y = h + 10;
          e.x = Math.random() * w;
        }
        const drift = Math.sin(t * e.swaySpeed + e.sway) * e.swayAmp * 0.02;
        e.x += drift;

        ctx.globalAlpha = e.alpha;
        ctx.fillStyle = '#E0693E';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }

    function animateLight() {
      dots.forEach((s) => {
        const twinkle = 0.16 + Math.sin(t * s.speed + s.phase) * 0.1;
        ctx.globalAlpha = Math.max(0, twinkle);
        ctx.fillStyle = '#F0A93B';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      flecks.forEach((e) => {
        e.y += e.vy;
        e.rot += e.rotSpeed;
        if (e.y > h + 10) {
          e.y = -10;
          e.x = Math.random() * w;
        }
        const drift = Math.sin(t * e.swaySpeed + e.sway) * e.swayAmp * 0.03;
        e.x += drift;

        ctx.globalAlpha = e.alpha;
        ctx.fillStyle = e.color;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, e.rw, e.rh, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    function animate() {
      t += 1;
      ctx.clearRect(0, 0, w, h);
      if (theme === 'light') {
        animateLight();
      } else {
        animateDark();
      }
      ctx.globalAlpha = 1;
      frameId = requestAnimationFrame(animate);
    }

    function regenerate() {
      makeDots();
      makeFlecks();
      if (reduceMotion) drawStatic();
    }

    function handleResize() {
      size();
      regenerate();
    }

    size();
    regenerate();

    if (reduceMotion) {
      drawStatic();
    } else {
      frameId = requestAnimationFrame(animate);
    }

    window.addEventListener('resize', handleResize);

    const observer = new MutationObserver(() => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      if (next !== theme) {
        theme = next;
        regenerate();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas className="site-stars" ref={canvasRef} aria-hidden="true" />;
}
