import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

const TEXT_SELECTOR = [
  'main h1',
  'main h2',
  'main h3',
].join(',');

const CARD_SELECTOR = [
  'main .art-card',
  'main .motion-card',
  'main .motion-stat',
  'main .motion-copy',
  'main [class*="hair-all"][class*="bg-[var(--card)]"]',
  'main [style*="background: var(--card)"]',
].join(',');

function registerGsap() {
  if (registered || typeof window === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power3.out' });
  registered = true;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function shouldSkipText(node) {
  if (node.closest('header, footer, .fixed, .user-menu-panel, .notif-menu')) return true;
  if (node.closest('button, a, input, textarea, select')) return true;
  if (node.closest('.motion-card')) return true;
  return !node.textContent?.trim();
}

function shouldSkipCard(node) {
  if (node.closest('header, footer, .fixed, .user-menu-panel, .notif-menu')) return true;
  if (node.matches('form, button, a, input, textarea, select, option')) return true;
  if (node.closest('button, a') && !node.classList.contains('art-card')) return true;
  if (node.classList.contains('sticky')) return true;

  const rect = node.getBoundingClientRect();
  return rect.width < 132 || rect.height < 56;
}

function batchReveal(nodes, vars, scrollVars, triggers) {
  if (!nodes.length) return;
  const created = ScrollTrigger.batch(nodes, {
    start: 'top 91%',
    once: true,
    interval: 0.08,
    batchMax: 8,
    onEnter: (batch) => {
      gsap.to(batch, {
        ...vars,
        stagger: {
          each: scrollVars.stagger || 0.075,
          from: 'start',
        },
        overwrite: 'auto',
        onComplete: () => {
          gsap.set(batch, { clearProps: scrollVars.clearProps || 'opacity,transform,filter,clipPath' });
        },
      });
    },
  });
  triggers.push(...[].concat(created).filter(Boolean));
}

function bindCardHover(card, cleanups, reducedMotion = false) {
  if (card.dataset.gsapHoverBound === 'true') return;
  card.dataset.gsapHoverBound = 'true';

  if (reducedMotion) {
    cleanups.push(() => {
      delete card.dataset.gsapHoverBound;
    });
    return;
  }

  const media = card.querySelector('img, svg');
  const arrow = card.querySelector('.art-arrow');

  const enter = () => {
    gsap.to(card, {
      y: -8,
      scale: 1.004,
      duration: 0.55,
      ease: 'expo.out',
      overwrite: 'auto',
    });
    if (media) {
      gsap.to(media, {
        scale: 1.045,
        duration: 1.05,
        ease: 'expo.out',
        overwrite: 'auto',
      });
    }
    if (arrow) {
      gsap.to(arrow, {
        x: 4,
        y: -4,
        duration: 0.45,
        ease: 'expo.out',
        overwrite: 'auto',
      });
    }
  };

  const leave = () => {
    gsap.to(card, {
      y: 0,
      scale: 1,
      duration: 0.7,
      ease: 'expo.out',
      overwrite: 'auto',
    });
    if (media) {
      gsap.to(media, {
        scale: 1,
        duration: 0.95,
        ease: 'expo.out',
        overwrite: 'auto',
      });
    }
    if (arrow) {
      gsap.to(arrow, {
        x: 0,
        y: 0,
        duration: 0.55,
        ease: 'expo.out',
        overwrite: 'auto',
      });
    }
  };

  card.addEventListener('mouseenter', enter);
  card.addEventListener('mouseleave', leave);
  cleanups.push(() => {
    card.removeEventListener('mouseenter', enter);
    card.removeEventListener('mouseleave', leave);
    delete card.dataset.gsapHoverBound;
  });
}

export function useFormaMotion(deps = []) {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const root = document.querySelector('.swiss-app');
    if (!root) return undefined;

    registerGsap();
    const reducedMotion = prefersReducedMotion();
    const motion = reducedMotion
      ? {
          cardY: 18,
          cardScale: 0.992,
          cardBlur: 'blur(2px)',
          cardDuration: 0.92,
          cardStagger: 0.055,
          textY: 18,
          headingY: 30,
          textBlur: 'blur(2px)',
          headingBlur: 'blur(4px)',
          textDuration: 0.88,
          textStagger: 0.045,
          clipPath: 'inset(0% 0% 12% 0%)',
        }
      : {
          cardY: 46,
          cardScale: 0.965,
          cardBlur: 'blur(8px)',
          cardDuration: 1.2,
          cardStagger: 0.085,
          textY: 24,
          headingY: 58,
          textBlur: 'blur(5px)',
          headingBlur: 'blur(10px)',
          textDuration: 1.05,
          textStagger: 0.055,
          clipPath: 'inset(0% 0% 24% 0%)',
        };
    root.classList.add('gsap-motion');
    root.classList.toggle('motion-reduced', reducedMotion);

    const animated = new WeakSet();
    const triggers = [];
    const cleanups = [];

    const animateNewNodes = () => {
      const cards = Array.from(root.querySelectorAll(CARD_SELECTOR))
        .filter(node => !animated.has(node) && !shouldSkipCard(node));
      const text = Array.from(root.querySelectorAll(TEXT_SELECTOR))
        .filter(node => !animated.has(node) && !shouldSkipText(node));

      cards.forEach((node, index) => {
        animated.add(node);
        node.classList.add('motion-card');
        gsap.set(node, {
          autoAlpha: 0,
          y: motion.cardY,
          scale: motion.cardScale,
          rotationZ: reducedMotion ? 0 : ((index % 5) - 2) * 0.22,
          filter: motion.cardBlur,
          transformOrigin: '50% 84%',
        });
        bindCardHover(node, cleanups, reducedMotion);
      });

      text.forEach((node) => {
        animated.add(node);
        node.classList.add('motion-text');
        gsap.set(node, {
          autoAlpha: 0,
          y: node.matches('h1, h2, h3') ? motion.headingY : motion.textY,
          filter: node.matches('h1, h2, h3') ? motion.headingBlur : motion.textBlur,
          clipPath: motion.clipPath,
        });
      });

      batchReveal(cards, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        rotationZ: 0,
        filter: 'blur(0px)',
        duration: motion.cardDuration,
        ease: 'expo.out',
      }, { stagger: motion.cardStagger }, triggers);

      batchReveal(text, {
        autoAlpha: 1,
        y: 0,
        filter: 'blur(0px)',
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: motion.textDuration,
        ease: 'expo.out',
      }, { stagger: motion.textStagger }, triggers);

      ScrollTrigger.refresh();
    };

    animateNewNodes();
    const observer = new MutationObserver(animateNewNodes);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach(cleanup => cleanup());
      triggers.forEach(trigger => trigger?.kill?.());
      gsap.killTweensOf(root.querySelectorAll('.motion-card, .motion-text'));
      root.classList.remove('gsap-motion');
      root.classList.remove('motion-reduced');
    };
  }, deps);
}
