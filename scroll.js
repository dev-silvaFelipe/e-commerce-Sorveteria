document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('header');
  const backTopLinks = document.querySelectorAll('.footer__back-top');

  if (!header || backTopLinks.length === 0) return;

  backTopLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();

      window.scrollTo({
        top: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth'
      });
    });
  });
});