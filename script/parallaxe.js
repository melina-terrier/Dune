/* Parallax : 1 listener scroll global qui itère sur les éléments enregistrés.
   Respecte prefers-reduced-motion (registre + runtime) + désactivé en mobile. */

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width: 768px)');
const registry = [];
let ticking = false;

function update() {
  ticking = false;
  if (reducedMotion.matches || mobile.matches) return;
  const h = innerHeight, posY = scrollY;
  for (const {element, vitesse} of registry) {
    const y = element.getBoundingClientRect().top + posY;
    if (y > posY + h || posY > y + element.offsetHeight) continue;
    element.style.backgroundPositionY = `${Math.round((y - posY) * vitesse)}px`;
  }
}

const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(update);
};

// Reset si on passe en mobile ou reduce-motion en cours de session
const reset = () => registry.forEach(({element}) => (element.style.backgroundPositionY = ''));
reducedMotion.addEventListener('change', (e) => { if (e.matches) reset(); });
mobile.addEventListener('change', (e) => { if (e.matches) reset(); });

export function parallaxe(element, vitesse) {
  if (!element || reducedMotion.matches) return;
  registry.push({element, vitesse});
  if (registry.length === 1) addEventListener('scroll', onScroll, {passive: true});
  update();
}
