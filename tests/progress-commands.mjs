export const progressCommands = {
  async progressReducedMotion({ context, page }, markup) {
    const isolated = await context.browser().newContext({ reducedMotion: 'reduce' });
    try {
      const sample = await isolated.newPage();
      const url = new URL('/tests/progress-reduced-motion.html', page.url()).href;
      await sample.route(url, route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html>
        <meta charset="utf-8">
        ${markup}
        <script type="module" src="/src/progress-bar.ts"></script>
        <script type="module" src="/src/progress-ring.ts"></script>` }));
      await sample.goto(url);
      await sample.getByRole('progressbar', { name: 'Transfer', exact: true }).waitFor();
      await sample.getByRole('progressbar', { name: 'Compact transfer', exact: true }).waitFor();
      await sample.getByRole('progressbar', { name: 'Loading', exact: true }).waitFor();
      return await sample.evaluate(async () => {
        const track = document.querySelector('metro-progress-bar[indeterminate]').shadowRoot.querySelector('[part="track"]');
        const ring = document.querySelector('metro-progress-ring').shadowRoot.querySelector('[part="ring"]');
        const compactTrack = document.querySelector('metro-progress-bar[label="Compact transfer"]').shadowRoot.querySelector('[part="track"]');
        const compactWidth = compactTrack.getBoundingClientRect().width;
        const compactDots = [...compactTrack.querySelectorAll('.dot')].map(dot => relativeState(dot, compactTrack))
          .filter(dot => dot.width > 1 && Math.abs(dot.height - dot.width) < .05 && dot.x >= -.25
            && dot.x + dot.width <= compactWidth + .25 && dot.animation === 'none').length;
        const dots = [...track.querySelectorAll('.dot')];
        const arms = [...ring.querySelectorAll('.arm')].filter(arm => getComputedStyle(arm).display !== 'none');

        function relativeState(element, origin) {
          const anchor = origin.getBoundingClientRect();
          const style = getComputedStyle(element);
          const { x, y, width, height } = element.getBoundingClientRect();
          return { animation: style.animationName, translate: style.translate, rotate: style.rotate,
            opacity: style.opacity, x: x - anchor.x, y: y - anchor.y, width, height };
        }

        const report = () => [...dots.map(dot => relativeState(dot, track)), relativeState(ring, ring),
          ...arms.map(arm => relativeState(arm, ring))];
        const initial = report();
        const initialState = JSON.stringify(initial);
        const width = track.getBoundingClientRect().width;
        const visibleDots = initial.slice(0, dots.length).filter(dot =>
          dot.width > 0 && dot.height > 0 && dot.x >= 0 && dot.x + dot.width <= width).length;
        const started = performance.now();
        let frames = 0;
        let stationary = true;
        do {
          await new Promise(resolve => requestAnimationFrame(resolve));
          frames++;
          if (JSON.stringify(report()) !== initialState) stationary = false;
        } while (performance.now() - started < 200 || frames < 2);

        return { reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
          noPreference: matchMedia('(prefers-reduced-motion: no-preference)').matches,
          animationNames: initial.map(element => element.animation), dots: dots.length, arms: arms.length,
          visibleDots, compactDots, stationary };
      });
    } finally {
      await isolated.close();
    }
  },
};
