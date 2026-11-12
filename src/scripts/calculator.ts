export function initCalculator() {
  const PHONE = '56962206148';
  let basePrice = 45990;
  let selectedType = 'Promoción Pyme Sitio Web (Inicial $45.990 + $25.000/mes)';

  const typeBtns = document.querySelectorAll('.type-btn');
  const modChecks = document.querySelectorAll('.mod-check');
  const totalPriceEl = document.getElementById('total-price');
  const quoteSummaryEl = document.getElementById('quote-summary');
  const sendQuoteBtn = document.getElementById('send-quote');

  function formatCLP(n: number): string {
    return `$${n.toLocaleString('es-CL')} CLP`;
  }

  function getSelectedModules(): { name: string, price: number }[] {
    const mods: { name: string, price: number }[] = [];
    modChecks.forEach((chk) => {
      const input = chk as HTMLInputElement;
      if (input.checked) {
        mods.push({
          name: input.getAttribute('data-name') || 'Módulo',
          price: parseInt(input.value, 10) || 0,
        });
      }
    });
    return mods;
  }

  function calculateTotal(): number {
    const mods = getSelectedModules();
    const modsTotal = mods.reduce((sum, m) => sum + m.price, 0);
    return basePrice + modsTotal;
  }

  function updateUI() {
    const total = calculateTotal();
    const mods = getSelectedModules();

    if (totalPriceEl) totalPriceEl.textContent = formatCLP(total);
    
    const summaryText = mods.length === 0 ? selectedType : `${selectedType} + ${mods.map((m) => m.name).join(' · ')}`;
    if (quoteSummaryEl) quoteSummaryEl.textContent = summaryText;

    const formSelectionEl = document.getElementById('form-selection');
    const formTotalEl = document.getElementById('form-total');
    if (formSelectionEl) formSelectionEl.textContent = summaryText;
    if (formTotalEl) formTotalEl.textContent = formatCLP(total);
  }

  function buildWhatsAppMessage(): string {
    const mods = getSelectedModules();
    const total = calculateTotal();

    let lines = [
      'Hola! Quiero solicitar una cotización con Kadmiel:',
      '',
      `• Proyecto: ${selectedType} (${formatCLP(basePrice)})`,
    ];

    if (mods.length > 0) {
      lines.push('• Módulos adicionales:');
      mods.forEach((m) => lines.push(`  – ${m.name}: ${formatCLP(m.price)}`));
    } else {
      lines.push('• Sin módulos adicionales');
    }

    lines.push('', `*Total estimado: ${formatCLP(total)}*`, '', '¿Podemos conversar sobre este proyecto?');
    return lines.join('\n');
  }

  function openWhatsApp() {
    const message = encodeURIComponent(buildWhatsAppMessage());
    window.open(`https://wa.me/${PHONE}?text=${message}`, '_blank', 'noopener,noreferrer');
  }

  typeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      typeBtns.forEach((b) => {
        b.classList.remove('border-violet-500', 'bg-violet-500/10', 'active');
        b.classList.add('border-slate-800');
        b.setAttribute('aria-pressed', 'false');
        const priceSpan = b.querySelector('span:last-child');
        if (priceSpan) {
          priceSpan.classList.remove('text-violet-300');
          priceSpan.classList.add('text-slate-400');
        }
      });

      btn.classList.remove('border-slate-800');
      btn.classList.add('border-violet-500', 'bg-violet-500/10', 'active');
      btn.setAttribute('aria-pressed', 'true');

      const activePriceSpan = btn.querySelector('span:last-child');
      if (activePriceSpan) {
        activePriceSpan.classList.remove('text-slate-400');
        activePriceSpan.classList.add('text-violet-300');
      }

      basePrice = parseInt(btn.getAttribute('data-price') || '150000', 10);
      selectedType = btn.getAttribute('data-type') || 'Landing Page';
      updateUI();
    });
  });

  modChecks.forEach((chk) => chk.addEventListener('change', updateUI));
  sendQuoteBtn?.addEventListener('click', openWhatsApp);

  // Lógica del formulario de correo
  const CONTACT_EMAIL = 'contacto@kadmiel.cl';
  const CONTACT_ENDPOINT = '/api/contact';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const emailToggle = document.getElementById('email-toggle') as HTMLButtonElement | null;
  const emailToggleIcon = document.getElementById('email-toggle-icon');
  const formPanel = document.getElementById('quote-form-panel');
  const formView = document.getElementById('quote-form-view');
  const successView = document.getElementById('quote-success-view');
  const successEmailEl = document.getElementById('quote-success-email');
  const quoteForm = document.getElementById('quote-form') as HTMLFormElement | null;
  const submitBtn = document.getElementById('quote-submit') as HTMLButtonElement | null;
  const submitLabel = document.getElementById('quote-submit-label');
  const spinner = document.getElementById('quote-spinner');
  const errorBox = document.getElementById('quote-error');
  const errorText = document.getElementById('quote-error-text');
  const mailtoLink = document.getElementById('quote-mailto') as HTMLAnchorElement | null;
  const cancelBtn = document.getElementById('quote-cancel');
  const doneBtn = document.getElementById('quote-done');

  function isPanelOpen(): boolean { return formPanel?.dataset.open === 'true'; }

  function setPanelOpen(open: boolean, opts: { focus?: boolean } = {}) {
    if (!formPanel || !emailToggle) return;
    formPanel.dataset.open = String(open);
    emailToggle.setAttribute('aria-expanded', String(open));
    if (emailToggleIcon) emailToggleIcon.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';

    if (open) {
      formPanel.removeAttribute('inert');
      formPanel.removeAttribute('aria-hidden');
    } else {
      formPanel.setAttribute('inert', '');
      formPanel.setAttribute('aria-hidden', 'true');
    }

    if (open && opts.focus !== false) {
      window.setTimeout(() => {
        formPanel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
        const first = successView && !successView.classList.contains('hidden') ? doneBtn : (document.getElementById('qf-name') as HTMLElement | null);
        first?.focus({ preventScroll: true });
      }, reduceMotion ? 0 : 350);
    }
  }

  function showFormState() { formView?.classList.remove('hidden'); successView?.classList.add('hidden'); }
  function setSending(sending: boolean) {
    if (submitBtn) submitBtn.disabled = sending;
    if (spinner) spinner.classList.toggle('hidden', !sending);
    if (submitLabel) submitLabel.textContent = sending ? 'Enviando…' : 'Enviar solicitud';
  }
  function hideError() { errorBox?.classList.add('hidden'); }

  function buildMailBody(p: any): string {
    const lines = ['Hola! Quiero solicitar una cotización con Kadmiel:', '', `• Proyecto: ${p.project} (${formatCLP(p.projectPrice)})`];
    if (p.modules.length > 0) { lines.push('• Módulos adicionales:'); p.modules.forEach((m: any) => lines.push(`  – ${m.name}: ${formatCLP(m.price)}`)); } else { lines.push('• Sin módulos adicionales'); }
    lines.push('', `Total estimado: ${formatCLP(p.total)}`, '');
    lines.push(`Nombre: ${p.name}`);
    if (p.company) lines.push(`Empresa / proyecto: ${p.company}`);
    if (p.phone) lines.push(`Teléfono: ${p.phone}`);
    lines.push(`Correo: ${p.email}`);
    if (p.message) lines.push('', p.message);
    return lines.join('\n');
  }

  function showError(payload: any, text: string) {
    if (errorText) errorText.textContent = text;
    if (mailtoLink) mailtoLink.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Cotización web: ${payload.project}`)}&body=${encodeURIComponent(buildMailBody(payload))}`;
    errorBox?.classList.remove('hidden');
  }

  function collectPayload(form: HTMLFormElement) {
    const data = new FormData(form);
    const get = (key: string) => String(data.get(key) ?? '').trim();
    return { name: get('name'), email: get('email'), phone: get('phone'), company: get('company'), message: get('message'), website: get('website'), project: selectedType, projectPrice: basePrice, modules: getSelectedModules(), total: calculateTotal() };
  }

  emailToggle?.addEventListener('click', () => { if (!isPanelOpen()) { showFormState(); hideError(); } setPanelOpen(!isPanelOpen()); });
  cancelBtn?.addEventListener('click', () => { setPanelOpen(false); emailToggle?.focus({ preventScroll: true }); });
  doneBtn?.addEventListener('click', () => { setPanelOpen(false); emailToggle?.focus({ preventScroll: true }); window.setTimeout(showFormState, reduceMotion ? 0 : 650); });
  formPanel?.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') { setPanelOpen(false); emailToggle?.focus({ preventScroll: true }); } });

  quoteForm?.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    if (!quoteForm.reportValidity()) return;
    const payload = collectPayload(quoteForm);
    hideError(); setSending(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(CONTACT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
      if (!res.ok) throw new Error(res.status === 400 ? 'invalid' : 'server');
      if (successEmailEl) successEmailEl.textContent = payload.email;
      formView?.classList.add('hidden'); successView?.classList.remove('hidden');
      quoteForm.reset(); doneBtn?.focus({ preventScroll: true });
    } catch (err: any) {
      const invalid = err.message === 'invalid';
      showError(payload, invalid ? 'Revisa los datos ingresados e inténtalo de nuevo.' : 'No pudimos enviar tu solicitud en este momento.');
    } finally { window.clearTimeout(timeout); setSending(false); }
  });

  updateUI();
}