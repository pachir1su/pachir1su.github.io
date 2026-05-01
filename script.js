// AOS
AOS.init({ once: true, duration: 700, easing: 'ease-out-cubic' });

// VanillaTilt
VanillaTilt.init(document.querySelectorAll(".skill-card, .project-card, .award-card"), {
  max: 8, speed: 400, glare: true, "max-glare": 0.15,
});

// Custom Cursor
const dot = document.querySelector('.cursor-dot');
const outline = document.querySelector('.cursor-outline');
if (dot && outline) {
  window.addEventListener('mousemove', (e) => {
    dot.style.left = e.clientX + 'px';
    dot.style.top = e.clientY + 'px';
    outline.style.left = e.clientX + 'px';
    outline.style.top = e.clientY + 'px';
  });
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => {
      outline.style.transform = 'translate(-50%,-50%) scale(1.5)';
      outline.style.borderColor = 'rgba(79,142,247,0.8)';
    });
    el.addEventListener('mouseleave', () => {
      outline.style.transform = 'translate(-50%,-50%) scale(1)';
      outline.style.borderColor = 'rgba(79,142,247,0.5)';
    });
  });
}

// Progress bar & scroll button
const mybutton = document.getElementById("btn-back-to-top");
window.onscroll = function () {
  const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  document.getElementById("myBar").style.width = (winScroll / height * 100) + "%";
  if (mybutton) mybutton.style.display = winScroll > 300 ? "flex" : "none";
};

if (mybutton) {
  mybutton.style.alignItems = 'center';
  mybutton.style.justifyContent = 'center';
  mybutton.addEventListener("click", () => {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  });
}

// Typing effect
const typingText = document.getElementById("typing-text");
if (typingText) {
  const words = ["풀스택 개발자", "메이커", "아이디어 뱅크", "팀 리더", "엔지니어"];
  let wordIndex = 0, charIndex = 0, isDeleting = false, typeSpeed = 100;
  function type() {
    const currentWord = words[wordIndex];
    typingText.textContent = isDeleting
      ? currentWord.substring(0, charIndex - 1)
      : currentWord.substring(0, charIndex + 1);
    isDeleting ? charIndex-- : charIndex++;
    typeSpeed = isDeleting ? 50 : 100;
    if (!isDeleting && charIndex === currentWord.length) { isDeleting = true; typeSpeed = 2000; }
    else if (isDeleting && charIndex === 0) { isDeleting = false; wordIndex = (wordIndex + 1) % words.length; typeSpeed = 500; }
    setTimeout(type, typeSpeed);
  }
  type();
}

// Mobile menu
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });
}
function closeMobile() {
  if (mobileMenu) mobileMenu.classList.remove('open');
}

// Context menu / drag / select prevention
document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("dragstart", e => e.preventDefault());
document.addEventListener("selectstart", e => e.preventDefault());
