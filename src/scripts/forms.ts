/**
 * Progressive enhancement for every form[data-enquiry]:
 * prefill from the URL, validate on blur and submit, show an error summary,
 * submit with fetch and show the success state without a page reload.
 * Without JS the form still posts to the PHP handler, which redirects to /thank-you/.
 */
import { track } from './track';

const MESSAGES: Record<string, string> = {
  valueMissing: 'This field is required.',
  typeMismatch: 'Enter a valid email address.',
  patternMismatch: 'Enter a valid phone number.',
  rangeUnderflow: 'Enter a number of at least 1.',
  rangeOverflow: 'That number looks too large.',
  tooLong: 'This is too long.',
};

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function labelText(f: Field) {
  const l = f.labels?.[0]?.textContent ?? f.name;
  return l.replace('*', '').trim();
}

function setError(f: Field, msg: string | null) {
  const wrap = f.closest('.field');
  if (!wrap) return;
  let el = wrap.querySelector<HTMLElement>('.error');
  if (msg) {
    wrap.setAttribute('data-invalid', '');
    f.setAttribute('aria-invalid', 'true');
    if (!el) {
      el = document.createElement('span');
      el.className = 'error';
      el.id = `${f.id}-error`;
      wrap.appendChild(el);
    }
    el.textContent = msg;
    f.setAttribute('aria-describedby', el.id);
  } else {
    wrap.removeAttribute('data-invalid');
    f.removeAttribute('aria-invalid');
    f.removeAttribute('aria-describedby');
    el?.remove();
  }
}

function check(f: Field): string | null {
  if (f.validity.valid) return null;
  for (const k of Object.keys(MESSAGES)) if (f.validity[k as keyof ValidityState]) return MESSAGES[k];
  return 'Check this field.';
}

function prefill(form: HTMLFormElement) {
  const q = new URLSearchParams(location.search);
  const src = form.querySelector<HTMLInputElement>('[data-source-page]');
  if (src) src.value = location.pathname;
  const qty = q.get('qty');
  const qtyEl = form.querySelector<HTMLInputElement>('[data-qty]');
  if (qty && qtyEl && !qtyEl.value) qtyEl.value = String(Math.max(1, parseInt(qty, 10) || 1));
  if (q.get('type') === 'enterprise') {
    const t = form.querySelector<HTMLInputElement>('[data-enquiry-type]');
    if (t) t.value = 'enterprise';
    if (qtyEl && !qtyEl.value) qtyEl.placeholder = 'e.g. 100';
  }
  const product = q.get('product');
  const ps = form.querySelector<HTMLInputElement>('[data-product-slug]');
  if (product && ps) ps.value = product;
  const config = q.get('config');
  if (config) {
    form.querySelectorAll<HTMLInputElement>('[data-config-choice]').forEach((i) => (i.value = config.slice(0, 300)));
    form.querySelectorAll<HTMLElement>('[data-config-ctx]').forEach((el) => { el.hidden = false; el.querySelector('strong')!.textContent = config.slice(0, 300); });
  }
  const cat = q.get('category');
  if (cat) form.querySelectorAll<HTMLInputElement>(`input[name="equipment[]"][value="${CSS.escape(cat)}"]`).forEach((c) => (c.checked = true));
  const city = q.get('city');
  const citySel = form.querySelector<HTMLSelectElement>('select[name="city"]');
  if (city && citySel) {
    const opt = [...citySel.options].find((o) => o.value.toLowerCase() === city.toLowerCase());
    if (opt) citySel.value = opt.value;
  }
}

function init(form: HTMLFormElement) {
  prefill(form);
  const fields = () => [...form.querySelectorAll<Field>('input:not([type=hidden]):not([type=checkbox]):not([name=website]), select, textarea')];
  fields().forEach((f) => {
    f.addEventListener('blur', () => { if (f.value || f.hasAttribute('data-touched')) setError(f, check(f)); f.setAttribute('data-touched', ''); });
    f.addEventListener('input', () => { if (f.closest('[data-invalid]')) setError(f, check(f)); });
  });

  const summary = form.querySelector<HTMLElement>('[data-error-summary]');
  const success = form.querySelector<HTMLElement>('[data-success]');
  const fail = form.querySelector<HTMLElement>('[data-fail]');
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]');
  const label = submit?.querySelector<HTMLElement>('[data-label]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (fail) fail.hidden = true;
    const errors: { id: string; text: string }[] = [];
    fields().forEach((f) => {
      const m = check(f);
      setError(f, m);
      if (m) errors.push({ id: f.id, text: `${labelText(f)}: ${m}` });
    });
    const equip = form.querySelectorAll<HTMLInputElement>('input[name="equipment[]"]');
    if (equip.length && ![...equip].some((c) => c.checked)) errors.unshift({ id: equip[0].id, text: 'Equipment: choose at least one type.' });

    if (errors.length && summary) {
      const ul = summary.querySelector('ul')!;
      ul.innerHTML = '';
      errors.forEach((er) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${er.id}`;
        a.textContent = er.text;
        a.addEventListener('click', (ev) => { ev.preventDefault(); document.getElementById(er.id)?.focus(); });
        li.appendChild(a);
        ul.appendChild(li);
      });
      summary.hidden = false;
      summary.focus();
      return;
    }
    if (summary) summary.hidden = true;

    submit?.setAttribute('aria-busy', 'true');
    if (submit) submit.disabled = true;
    const original = label?.textContent;
    if (label) label.textContent = 'Sending…';
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Request failed');
      form.classList.add('is-done');
      if (success) { success.hidden = false; success.focus(); }
      track(form.dataset.formType === 'support' ? 'support_submit' : 'generate_lead', {
        form_type: form.dataset.formType,
        enquiry_type: (form.querySelector<HTMLInputElement>('[data-enquiry-type]')?.value) ?? undefined,
      });
    } catch (err) {
      if (fail) { fail.hidden = false; fail.focus?.(); }
    } finally {
      submit?.removeAttribute('aria-busy');
      if (submit) submit.disabled = false;
      if (label && original) label.textContent = original;
    }
  });
}

document.querySelectorAll<HTMLFormElement>('form[data-enquiry]').forEach(init);
