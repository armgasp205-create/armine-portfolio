// Add only contact details confirmed by the owner.
const contact = { phone: "+37477834023", instagram: "https://www.instagram.com/aso_exoyan/" };
const menu = document.querySelector('.menu-toggle');
const navigation = document.getElementById('navigation');
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.querySelector('span').textContent = open ? '−' : '＋';
  navigation.classList.toggle('open', open);
});
navigation.addEventListener('click', event => {
  if (event.target.closest('a')) {
    menu.setAttribute('aria-expanded', 'false');
    menu.querySelector('span').textContent = '＋';
    navigation.classList.remove('open');
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('open')) {
    menu.click(); menu.focus();
  }
});
const service = document.getElementById('service');
document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
  service.value = link.dataset.service;
  document.getElementById('request-result').hidden = true;
}));
const date = document.getElementById('date');
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
date.min = localToday();
const form = document.getElementById('booking-form');
const result = document.getElementById('request-result');
const requestText = document.getElementById('request-text');
const error = document.getElementById('form-error');
form.addEventListener('input', event => {
  if (!event.target.closest('#request-result')) { result.hidden = true; error.textContent = ''; }
});
form.addEventListener('submit', event => {
  event.preventDefault();
  const name = document.getElementById('name').value.trim();
  if (!name || !date.value || date.value < localToday()) {
    error.textContent = 'Գրիր անունդ և ընտրիր այսօրվա կամ հաջորդ օրերից մեկը։'; return;
  }
  const note = document.getElementById('note').value.trim();
  requestText.value = `Բարև, Ասո։ Ես ${name} եմ։ Ցանկանում եմ պայմանավորվել այցի համար։\nԾառայություն՝ ${service.value}\nՑանկալի օրը՝ ${date.value}${note ? `\nԼրացուցիչ՝ ${note}` : ''}\nԿարո՞ղ ենք հաստատել ժամը։`;
  error.textContent = ''; document.getElementById('copy-status').textContent = '';
  result.hidden = false; requestText.focus();
});
document.getElementById('copy-request').addEventListener('click', async () => {
  const status = document.getElementById('copy-status');
  try {
    await navigator.clipboard.writeText(requestText.value);
    status.textContent = 'Պատճենված է։ Ուղարկիր հարցումը վարպետին՝ այցը հաստատելու համար։';
  } catch {
    requestText.focus(); requestText.select();
    status.textContent = 'Տեքստն ընտրված է։ Պատճենիր այն ձեռքով կամ Ctrl + C-ով։';
  }
});
const links = document.getElementById('contact-links');
links.replaceChildren();
if (contact.phone) {
  const link = document.createElement('a'); link.href = `tel:${contact.phone}`; link.textContent = contact.phone; links.append(link);
}
if (contact.instagram && /^https:\/\/(www\.)?instagram\.com\//.test(contact.instagram)) {
  const link = document.createElement('a'); link.href = contact.instagram; link.textContent = 'Instagram ↗'; links.append(link);
}
if (links.children.length) document.getElementById('contact-note').textContent = 'Պատրաստիր հարցումը և կապ հաստատիր՝ այցի ժամը ճշտելու համար։';
