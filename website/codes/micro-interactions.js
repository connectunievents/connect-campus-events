/*
  Small, consistent interactions for Connect. These are intentionally quiet:
  they support orientation and affordance without competing with page content.
*/
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const style = document.createElement('style');
  style.textContent = `
    #connectProgress{position:fixed;z-index:1000;top:0;left:0;height:3px;width:var(--connect-progress,0%);background:#3DBA6F;box-shadow:0 1px 7px rgba(61,186,111,.5);pointer-events:none;transition:width .12s linear}
    .ui-reveal{opacity:0;transform:translateY(16px);transition:opacity .58s cubic-bezier(.22,1,.36,1),transform .58s cubic-bezier(.22,1,.36,1)}
    .ui-reveal.ui-visible{opacity:1;transform:none}
    .ui-reveal:nth-child(2){transition-delay:.06s}.ui-reveal:nth-child(3){transition-delay:.12s}
    .event-card,.sponsor-card,.feat-card,.benefit-card,.role-card{will-change:transform;transition:transform .24s cubic-bezier(.22,1,.36,1),box-shadow .24s ease,border-color .24s ease}
    .event-card:hover,.sponsor-card:hover,.feat-card:hover,.benefit-card:hover{transform:translateY(-4px)}
    button:not(.connect-chat-toggle),.btn,.btn-hero-primary,.btn-hero-ghost,.btn-cta-primary,.btn-cta-ghost{transition:transform .18s ease,box-shadow .18s ease,background .22s ease,border-color .22s ease}
    button:not(:disabled):active,.btn:active,.btn-hero-primary:active,.btn-hero-ghost:active,.btn-cta-primary:active,.btn-cta-ghost:active{transform:translateY(1px) scale(.985)}
    a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid rgba(61,186,111,.48);outline-offset:3px}
    @media (prefers-reduced-motion: reduce){#connectProgress{transition:none}.ui-reveal{opacity:1;transform:none;transition:none}.event-card,.sponsor-card,.feat-card,.benefit-card,.role-card,button,.btn{transition:none!important}}
  `;

  function applyReveals(root = document) {
    const targets = root.querySelectorAll('.hero-inner, .about-hero, .page-header, .filter-bar, .sponsors-wrap, .auth-side-inner, .auth-form-wrap, main > section, main > aside, .page > section, .about-section');
    targets.forEach((element) => {
      if (element.classList.contains('ui-reveal') || element.classList.contains('reveal')) return;
      element.classList.add('ui-reveal');
    });
  }

  function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
    document.documentElement.style.setProperty('--connect-progress', `${progress}%`);
  }

  function initialize() {
    const progress = document.createElement('div');
    progress.id = 'connectProgress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.prepend(progress);

    applyReveals();
    if (reduceMotion || !('IntersectionObserver' in window)) {
      document.querySelectorAll('.ui-reveal').forEach((element) => element.classList.add('ui-visible'));
    } else {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('ui-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -28px' });
      document.querySelectorAll('.ui-reveal').forEach((element) => observer.observe(element));
      window.setTimeout(() => document.querySelectorAll('.hero-inner, .auth-side-inner, .auth-form-wrap, .page-header, .about-hero').forEach((element) => element.classList.add('ui-visible')), 40);
    }

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches('.event-card,.sponsor-card')) node.classList.add('ui-visible');
      }));
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
