// AOS
AOS.init({ once: true, duration: 650, easing: 'ease-out-cubic', offset: 60 });

// Navbar scroll state
const navbar = document.getElementById('navbar');
function updateNavbar() {
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
}
window.addEventListener('scroll', updateNavbar, { passive: true });
updateNavbar();

// Progress bar + back to top
const progressBar = document.getElementById('myBar');
const backToTop   = document.getElementById('btn-back-to-top');
window.addEventListener('scroll', () => {
  const scrolled = document.documentElement.scrollTop;
  const total    = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  if (progressBar) progressBar.style.width = `${(scrolled / total) * 100}%`;
  if (backToTop)   backToTop.style.display  = scrolled > 300 ? 'flex' : 'none';
}, { passive: true });
if (backToTop) {
  backToTop.style.alignItems = 'center';
  backToTop.style.justifyContent = 'center';
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// Typing effect
const typingEl = document.getElementById('typing-text');
if (typingEl) {
  const words = ['풀스택 개발자', '메이커', '아이디어 뱅크', '팀 리더', '엔지니어'];
  let wi = 0, ci = 0, deleting = false;
  (function type() {
    const w = words[wi];
    typingEl.textContent = deleting ? w.slice(0, --ci) : w.slice(0, ++ci);
    let delay = deleting ? 50 : 100;
    if (!deleting && ci === w.length)  { deleting = true;  delay = 2000; }
    if  (deleting && ci === 0)         { deleting = false; wi = (wi + 1) % words.length; delay = 500; }
    setTimeout(type, delay);
  })();
}

// Mobile menu
const hamburger   = document.getElementById('hamburger');
const mobileMenu  = document.getElementById('mobileMenu');
const menuClose   = document.getElementById('mobileMenuClose');

function openMobile() {
  mobileMenu?.classList.add('open');
  hamburger?.setAttribute('aria-expanded', 'true');
  hamburger?.setAttribute('aria-label', '메뉴 닫기');
  document.body.style.overflow = 'hidden';
}
function closeMobile() {
  mobileMenu?.classList.remove('open');
  hamburger?.setAttribute('aria-expanded', 'false');
  hamburger?.setAttribute('aria-label', '메뉴 열기');
  document.body.style.overflow = '';
}
hamburger?.addEventListener('click', () => {
  mobileMenu?.classList.contains('open') ? closeMobile() : openMobile();
});
menuClose?.addEventListener('click', closeMobile);

// Skills tabs
document.querySelectorAll('.skills-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetId = tab.dataset.tab;
    document.querySelectorAll('.skills-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.skills-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(`tab-panel-${targetId}`)?.classList.add('active');
  });
});
