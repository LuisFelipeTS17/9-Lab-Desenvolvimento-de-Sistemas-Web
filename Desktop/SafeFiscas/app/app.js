/* ============================================================
   SafeFiscas — logica do app (PWA, sem build, dados locais).
   Navegacao por hash (#/lista, #/nova, #/conferir, #/nota/:id, #/relatorio).
   ============================================================ */
(function () {
  'use strict';

  const app = document.getElementById('app');
  const cameraInput = document.getElementById('cameraInput');
  const toastHost = document.getElementById('toastHost');

  // ---------- Estado ----------
  const state = {
    notas: [],          // dados persistidos
    query: '',          // busca (tela lista)
    mesIdx: 0,          // relatorio: 0 = mes mais recente
    sel: null,          // detalhe: item selecionado no bottom sheet
    draft: null,        // rascunho da nota sendo criada (foto + campos)
    limiteAlerta: 7     // dias para alerta de vencimento
  };

  // ---------- Datas ----------
  const MES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  function hoje() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function toISO(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fromISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function fmtBR(iso) { if (!iso) return ''; const d = fromISO(iso); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }
  function fmtDM(iso) { const d = fromISO(iso); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); }
  function addMonths(iso, n) { const d = fromISO(iso); d.setMonth(d.getMonth() + n); return d; }
  function diasEntre(a, b) { return Math.round((b - a) / 86400000); }
  function brl(n) { return 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }
  function brlCurto(n) { return 'R$ ' + Number(n).toLocaleString('pt-BR'); }

  // ---------- Regras de garantia ----------
  // item: { id, nome, valor(number), meses(number), status?('Acionada'|'Devolvida'), acionadaEm?, devolvidaEm? }
  function statusItem(item, dataISO) {
    if (item.status === 'Acionada') return { status: 'Acionada', dias: null };
    if (item.status === 'Devolvida') return { status: 'Devolvida', dias: null };
    if (!item.meses || item.meses === 0) return { status: 'Sem garantia', dias: null };
    const fim = addMonths(dataISO, item.meses);
    const dias = diasEntre(hoje(), fim);
    return { status: dias < 0 ? 'Vencida' : 'Ativa', dias };
  }

  function statusNota(nota) {
    const sts = nota.itens.map((it) => statusItem(it, nota.data).status);
    if (sts.includes('Ativa')) return 'Ativa';
    if (sts.includes('Vencida')) return 'Vencida';
    if (sts.includes('Acionada')) return 'Acionada';
    if (sts.includes('Devolvida')) return 'Devolvida';
    return 'Sem garantia';
  }

  // Menor prazo entre itens ativos (para alerta na lista e hero no detalhe)
  function proximoVencimento(nota) {
    let best = null;
    nota.itens.forEach((it) => {
      const s = statusItem(it, nota.data);
      if (s.status === 'Ativa' && (best === null || s.dias < best.dias)) {
        best = { dias: s.dias, nome: it.nome };
      }
    });
    return best;
  }

  const BADGE_CLASS = {
    'Ativa': 'badge--ativa', 'Acionada': 'badge--acionada', 'Devolvida': 'badge--devolvida',
    'Sem garantia': 'badge--sem', 'Vencida': 'badge--vencida'
  };
  const BARRA_COR = {
    'Ativa': '#12a150', 'Acionada': '#e5a50a', 'Devolvida': '#9aa7b8',
    'Sem garantia': '#dbe1ea', 'Vencida': '#e5645a'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- Persistencia ----------
  async function persist() { await window.DB.saveNotas(state.notas); }

  function novoId() {
    const max = state.notas.reduce((m, n) => Math.max(m, n.numero || 0), 1040);
    return max + 1;
  }

  // ---------- Toast ----------
  function toast(msg, ok) {
    const el = document.createElement('div');
    el.className = 'toast' + (ok ? ' toast--ok' : '');
    el.innerHTML = (ok ? '<svg class="toast__check" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12.5 L10 17.5 L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '') + '<span>' + esc(msg) + '</span>';
    toastHost.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, 2400);
  }

  // ---------- Navegacao ----------
  function go(hash) { location.hash = hash; }
  function voltar() { history.length > 1 ? history.back() : go('#/lista'); }

  // ============================================================
  // TELAS
  // ============================================================

  // ---- Lista de notas ----
  function screenLista() {
    const q = state.query.trim().toLowerCase().replace(/-/g, '');
    const decoradas = state.notas.map((n) => {
      const st = statusNota(n);
      const prox = proximoVencimento(n);
      const principal = n.itens[0] ? n.itens[0].nome : '—';
      const mais = n.itens.length - 1;
      let alerta = null;
      if (prox && prox.dias <= state.limiteAlerta) {
        alerta = prox.nome + ' vence em ' + prox.dias + (prox.dias === 1 ? ' dia' : ' dias');
      }
      return { n, st, principal, mais, alerta };
    });
    const lista = q
      ? decoradas.filter((d) => (d.n.cliente + ' ' + d.n.placa + ' ' + d.n.itens.map((i) => i.nome).join(' ')).toLowerCase().replace(/-/g, '').includes(q))
      : decoradas;

    const cards = lista.map((d, i) => `
      <div class="card" data-action="open-nota" data-id="${d.n.id}" style="animation-delay:${Math.min(i, 8) * 40}ms">
        <div class="card__top">
          <div class="card__col">
            <span class="card__cliente">${esc(d.n.cliente)}</span>
            <span class="card__placa">${esc(d.n.placa)}</span>
          </div>
          <span class="badge ${BADGE_CLASS[d.st]}">${d.st}</span>
        </div>
        <div class="card__peca-row">
          <span class="card__peca">${esc(d.principal)}</span>
          ${d.mais > 0 ? `<span class="chip">+${d.mais} ${d.mais === 1 ? 'item' : 'itens'}</span>` : ''}
        </div>
        ${d.alerta ? `
          <div class="alert">
            <svg class="alert__dot" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2.5 L18.5 17 H1.5 Z" fill="#d92d20"/><rect x="9.1" y="7" width="1.8" height="5" rx="0.9" fill="#fff"/><rect x="9.1" y="13.2" width="1.8" height="1.8" rx="0.9" fill="#fff"/></svg>
            <span class="alert__text">${esc(d.alerta)}</span>
          </div>` : ''}
      </div>`).join('');

    return `
    <div class="screen">
      <div class="topbar topbar--home">
        <div class="topbar__row">
          <div class="topbar__titles">
            <span class="topbar__title">Notas</span>
            <span class="topbar__sub">Auto Peças São Jorge</span>
          </div>
          <div class="topbar__actions">
            <button class="icon-btn icon-btn--lg" data-action="relatorio" aria-label="Relatório de devoluções">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 3 h14 v18 l-7-4 -7 4 Z" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>
            </button>
            <div class="avatar">CV</div>
          </div>
        </div>
        <div class="searchbar ${state.query ? 'has-text' : ''}">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="flex-shrink:0"><circle cx="8.5" cy="8.5" r="6" stroke="#1b4f9c" stroke-width="2"/><line x1="13" y1="13" x2="18" y2="18" stroke="#1b4f9c" stroke-width="2" stroke-linecap="round"/></svg>
          <input id="search" value="${esc(state.query)}" placeholder="Placa, cliente ou peça…" autocomplete="off">
          <button class="searchbar__clear" data-action="clear-search" aria-label="Limpar busca">×</button>
        </div>
      </div>

      <div class="content content--pad-lg">
        <div class="section-head">
          <span class="section-label">${q ? 'RESULTADOS' : 'NOTAS RECENTES'}</span>
          <span class="section-count">${lista.length} ${lista.length === 1 ? 'nota' : 'notas'}</span>
        </div>
        ${lista.length ? cards : `<div class="empty">${q ? 'Nenhuma nota encontrada para essa busca.' : 'Nenhuma nota ainda. Toque em “Nova nota”.'}</div>`}
      </div>

      <div class="fab-wrap">
        <button class="fab" data-action="nova"><span class="fab__plus">+</span> Nova nota</button>
      </div>
    </div>`;
  }

  // ---- Nova nota (camera) ----
  function screenNova() {
    const processando = state.draft && state.draft.processando;
    return `
    <div class="screen screen--dark">
      <div class="cam-header">
        <button class="icon-btn icon-btn--light icon-btn--lg" data-action="voltar" aria-label="Voltar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4 L6 10 L12 16" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <span class="cam-header__title">Nova nota</span>
      </div>

      <div class="cam-stage">
        <div class="cam-hatch"></div>
        <div class="cam-frame">
          <div class="cam-corner tl"></div><div class="cam-corner tr"></div>
          <div class="cam-corner bl"></div><div class="cam-corner br"></div>
          <div class="cam-scan"></div>
          <div class="cam-doc"><div class="cam-doc__paper"></div></div>
        </div>
        <div class="cam-hint">
          <span class="cam-hint__title">Aponte para a nota fiscal</span>
          <div class="cam-hint__row">
            <span class="cam-hint__dot"></span>
            <span class="cam-hint__text">Encaixe a nota dentro da moldura</span>
          </div>
        </div>
      </div>

      <div class="cam-bar">
        <div class="cam-bar__row">
          <button class="cam-side" data-action="galeria">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2.5" stroke="#c3ccd9" stroke-width="2"/><circle cx="8.5" cy="10" r="1.8" fill="#c3ccd9"/><path d="M4 17 L9 12 L13 15 L16 12 L20 16" stroke="#c3ccd9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>Galeria</span>
          </button>
          <button class="cam-shutter" data-action="capture" aria-label="Tirar foto"><span></span></button>
          <button class="cam-side" data-action="capture">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M13 3 L13 8 M8 5.5 L18 5.5" stroke="#c3ccd9" stroke-width="2" stroke-linecap="round"/><path d="M6 8 h12 l-1 12 a1 1 0 0 1 -1 1 h-8 a1 1 0 0 1 -1 -1 z" stroke="#c3ccd9" stroke-width="2" stroke-linejoin="round"/><path d="M7.5 5.5 a4.5 4.5 0 0 1 9 0" stroke="#c3ccd9" stroke-width="2"/></svg>
            <span>Flash auto</span>
          </button>
        </div>
        <button class="btn" data-action="capture" style="border-radius:16px">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="3" stroke="#fff" stroke-width="2"/><path d="M8 7 L9.5 4.5 h5 L16 7" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="3.5" stroke="#fff" stroke-width="2"/></svg>
          Tirar foto da nota
        </button>
      </div>

      ${processando ? `
      <div class="cam-overlay">
        <div class="cam-overlay__check">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M5 12.5 L10 17.5 L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <span class="cam-overlay__title">Foto capturada</span>
        <span class="cam-overlay__text">Guardando a foto da nota…</span>
        <div class="dots"><span></span><span></span><span></span></div>
      </div>` : ''}
    </div>`;
  }

  // ---- Conferir dados (formulario de criacao) ----
  function screenConferir() {
    const d = state.draft || (state.draft = novoDraft());
    const itensHtml = d.itens.map((it, i) => `
      <div class="item-edit" data-idx="${i}">
        <div class="item-edit__main">
          <div class="item-edit__line">
            <input class="i-nome" value="${esc(it.nome)}" placeholder="Nome da peça">
          </div>
          <div class="item-edit__line">
            <input class="i-valor valor" value="${it.valor ? it.valor : ''}" inputmode="decimal" placeholder="Valor R$">
            <select class="i-meses">
              ${[0, 3, 6, 12, 24, 36].map((m) => `<option value="${m}" ${Number(it.meses) === m ? 'selected' : ''}>${m === 0 ? 'Sem garantia' : m + ' meses'}</option>`).join('')}
            </select>
          </div>
        </div>
        <button class="item-edit__del" data-action="del-item" data-idx="${i}" aria-label="Remover item">×</button>
      </div>`).join('');

    return `
    <div class="screen">
      <div class="topbar">
        <button class="icon-btn" data-action="voltar" aria-label="Voltar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4 L6 10 L12 16" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="topbar__titles">
          <span class="topbar__title topbar__title--sm">Conferir dados</span>
          <span class="topbar__sub">Preencha os dados da nota.</span>
        </div>
      </div>

      <div class="ai-banner">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style="flex-shrink:0"><path d="M10 2 L12.2 7.2 L18 8 L13.5 11.8 L15 17.5 L10 14.3 L5 17.5 L6.5 11.8 L2 8 L7.8 7.2 Z" fill="#1b4f9c"/></svg>
        <span>${d.foto ? 'Foto anexada. Confira e complete os dados.' : 'Preencha os dados desta nota.'}</span>
      </div>

      <div class="form-body">
        <div class="form-group">
          <div class="field">
            <label>CLIENTE · TELEFONE</label>
            <input id="f-cliente" value="${esc(d.cliente)}" placeholder="Nome do cliente · telefone">
          </div>
          <div class="field-row">
            <div class="field">
              <label>PLACA</label>
              <input id="f-placa" class="placa" value="${esc(d.placa)}" placeholder="ABC1D23">
            </div>
            <div class="field narrow">
              <label>DATA</label>
              <input id="f-data" type="date" value="${esc(d.data)}">
            </div>
          </div>
          <div class="field">
            <label>DISTRIBUIDORA · Nº NF</label>
            <input id="f-distribuidora" value="${esc(d.distribuidora)}" placeholder="Distribuidora · NF 0000">
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px">
          <div class="section-head">
            <span class="section-label section-label--sm">ITENS DA NOTA (${d.itens.length})</span>
            <span class="section-count">garantia por peça</span>
          </div>
          <div class="items-card">${itensHtml || ''}</div>
          <button class="add-item" data-action="add-item">
            <span style="font-size:20px;line-height:0">+</span> Adicionar item
          </button>
        </div>
      </div>

      <div class="footer-bar">
        <button class="btn" data-action="salvar">Salvar garantia</button>
      </div>
    </div>`;
  }

  // ---- Detalhe da nota ----
  function screenDetalhe(id) {
    const nota = state.notas.find((n) => n.id === id);
    if (!nota) { return `<div class="screen"><div class="topbar"><button class="icon-btn" data-action="voltar" aria-label="Voltar"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4 L6 10 L12 16" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><span class="topbar__title topbar__title--sm">Nota não encontrada</span></div></div>`; }

    const total = nota.itens.reduce((s, it) => s + Number(it.valor || 0), 0);
    const prox = proximoVencimento(nota);
    const itensHtml = nota.itens.map((it, i) => {
      const s = statusItem(it, nota.data);
      let sub = '', subCor = '#6b7a90';
      if (s.status === 'Ativa') { sub = 'Garantia ativa · ' + s.dias + (s.dias === 1 ? ' dia' : ' dias'); if (s.dias <= 7) subCor = '#b42318'; }
      else if (s.status === 'Vencida') { sub = 'Garantia vencida'; subCor = '#b42318'; }
      else if (s.status === 'Acionada') { sub = 'Acionada em ' + fmtDM(it.acionadaEm); subCor = '#8a6403'; }
      else if (s.status === 'Devolvida') { sub = 'Devolvida em ' + fmtDM(it.devolvidaEm); subCor = '#5a6474'; }
      else { sub = 'Sem garantia'; subCor = '#96a1b2'; }
      return `
      <div class="detail-item" data-action="open-item" data-idx="${i}" style="border-left-color:${BARRA_COR[s.status]};animation-delay:${Math.min(i, 8) * 35}ms">
        <div class="card__col">
          <span class="item-row__name">${esc(it.nome)}</span>
          <span class="detail-item__sub" style="color:${subCor}">${esc(sub)}</span>
        </div>
        <div class="item-row__right">
          <span class="badge ${BADGE_CLASS[s.status]}">${s.status}</span>
          <svg width="9" height="16" viewBox="0 0 9 16" fill="none"><path d="M1.5 1.5 L7 8 L1.5 14.5" stroke="#b6c2d2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </div>`;
    }).join('');

    return `
    <div class="screen">
      <div class="topbar">
        <button class="icon-btn" data-action="voltar" aria-label="Voltar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4 L6 10 L12 16" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="topbar__titles">
          <span class="topbar__title topbar__title--sm">Nota #${nota.numero}</span>
          <span class="topbar__sub">${esc(nota.cliente.split('·')[0].trim())} · ${esc(nota.placa)} · ${nota.itens.length} itens</span>
        </div>
      </div>

      <div class="content" style="padding-bottom:32px">
        ${prox && prox.dias <= state.limiteAlerta ? `
        <div class="hero-alert">
          <div class="hero-alert__icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 3 L22 20 H2 Z" fill="#fff"/><rect x="11" y="9" width="2" height="6" rx="1" fill="#b42318"/><rect x="11" y="16.2" width="2" height="2" rx="1" fill="#b42318"/></svg>
          </div>
          <div class="card__col">
            <span class="hero-alert__kicker">PRÓXIMA A VENCER</span>
            <span class="hero-alert__title">${esc(prox.nome)} — vence em ${prox.dias} ${prox.dias === 1 ? 'dia' : 'dias'}</span>
          </div>
        </div>` : ''}

        <div class="section-head">
          <span class="section-label">ITENS DA NOTA (${nota.itens.length})</span>
          <span class="section-count">garantia por peça</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">${itensHtml}</div>

        <div class="nf-card">
          <div class="nf-card__row">
            <div class="card__col">
              <span class="kicker">DISTRIBUIDORA · NF</span>
              <span style="font-size:15px;font-weight:500;color:#2b3a50">${esc(nota.distribuidora || '—')}</span>
            </div>
            <div class="nf-thumb">${nota.foto ? `<img src="${nota.foto}" alt="Foto da nota">` : `<span>sem<br>foto</span>`}</div>
          </div>
          <div class="divider"></div>
          <div class="total-row">
            <span class="section-label">TOTAL DA NOTA</span>
            <span class="total-row__value">${brl(total)}</span>
          </div>
        </div>
      </div>

      ${state.sel != null ? sheetHtml(nota, state.sel) : ''}
    </div>`;
  }

  function sheetHtml(nota, idx) {
    const it = nota.itens[idx];
    if (!it) return '';
    const s = statusItem(it, nota.data);
    let sub = '', subCor = '#6b7a90';
    if (s.status === 'Ativa') { sub = 'Garantia ativa · ' + s.dias + ' dias'; if (s.dias <= 7) subCor = '#b42318'; }
    else if (s.status === 'Vencida') { sub = 'Garantia vencida'; subCor = '#b42318'; }
    else if (s.status === 'Acionada') { sub = 'Acionada em ' + fmtDM(it.acionadaEm); subCor = '#8a6403'; }
    else if (s.status === 'Devolvida') { sub = 'Devolvida em ' + fmtDM(it.devolvidaEm); subCor = '#5a6474'; }
    else { sub = 'Sem garantia'; subCor = '#96a1b2'; }
    const encerrado = s.status === 'Devolvida' || s.status === 'Acionada';
    return `
    <div class="sheet-backdrop" data-action="close-sheet">
      <div class="sheet" data-stop>
        <div class="sheet__grip"></div>
        <div class="card__col">
          <span class="sheet__title">${esc(it.nome)}</span>
          <span class="sheet__sub" style="color:${subCor}">${esc(sub)}</span>
        </div>
        <div class="sheet__actions">
          ${encerrado
            ? `<button class="btn btn--outline" data-action="reabrir" data-idx="${idx}">Reabrir garantia</button>`
            : `<button class="btn btn--outline" data-action="acionar" data-idx="${idx}">Acionar item</button>
               <button class="btn" data-action="devolver" data-idx="${idx}">Devolver item</button>`}
        </div>
        <button class="btn btn--ghost" data-action="close-sheet">Cancelar</button>
      </div>
    </div>`;
  }

  // ---- Relatorio de devolucoes ----
  function screenRelatorio() {
    // Agrupa itens devolvidos por mes (a partir de devolvidaEm)
    const grupos = {}; // 'yyyy-mm' -> { label, itens:[], total }
    state.notas.forEach((n) => {
      n.itens.forEach((it) => {
        if (it.status === 'Devolvida' && it.devolvidaEm) {
          const d = fromISO(it.devolvidaEm);
          const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
          if (!grupos[key]) grupos[key] = { label: MES_NOMES[d.getMonth()] + ' ' + d.getFullYear(), itens: [], total: 0 };
          grupos[key].itens.push({
            peca: it.nome,
            info: n.cliente.split('·')[0].trim() + ' · dev. ' + fmtDM(it.devolvidaEm),
            valor: Number(it.valor || 0)
          });
          grupos[key].total += Number(it.valor || 0);
        }
      });
    });
    const keys = Object.keys(grupos).sort().reverse();
    const idx = Math.max(0, Math.min(state.mesIdx, keys.length - 1));
    const grupo = keys.length ? grupos[keys[idx]] : { label: MES_NOMES[hoje().getMonth()] + ' ' + hoje().getFullYear(), itens: [], total: 0 };
    grupo.itens.sort((a, b) => b.valor - a.valor);

    const linhas = grupo.itens.map((d) => `
      <div class="item-row">
        <div class="card__col">
          <span class="item-row__name">${esc(d.peca)}</span>
          <span class="item-row__sub">${esc(d.info)}</span>
        </div>
        <span style="font-size:17px;font-weight:700;color:#17263b;white-space:nowrap">${brlCurto(d.valor)}</span>
      </div>`).join('');

    const countLabel = grupo.itens.length + (grupo.itens.length === 1 ? ' item' : ' itens');

    return `
    <div class="screen">
      <div class="topbar">
        <button class="icon-btn" data-action="voltar" aria-label="Voltar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4 L6 10 L12 16" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <span class="topbar__title topbar__title--sm">Devoluções</span>
      </div>

      <div style="padding:16px 16px 8px">
        <div class="month-nav">
          <button data-action="mes-prev" ${idx >= keys.length - 1 ? 'disabled' : ''} aria-label="Mês anterior">
            <svg width="12" height="18" viewBox="0 0 12 18" fill="none"><path d="M9 2 L3 9 L9 16" stroke="#1b4f9c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <span class="month-nav__label">${esc(grupo.label)}</span>
          <button data-action="mes-next" ${idx <= 0 ? 'disabled' : ''} aria-label="Próximo mês">
            <svg width="12" height="18" viewBox="0 0 12 18" fill="none"><path d="M3 2 L9 9 L3 16" stroke="#1b4f9c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>

      <div class="content" style="padding-top:12px;padding-bottom:24px">
        <div class="section-head">
          <span class="section-label section-label--sm">ITENS DEVOLVIDOS NO MÊS</span>
          <span class="section-count">${countLabel}</span>
        </div>
        <div class="items-card">${linhas || '<div class="empty">Nenhuma devolução neste mês.</div>'}</div>
      </div>

      <div class="footer-bar">
        <div class="total-panel">
          <div class="card__col">
            <span class="total-panel__label">Total devolvido no mês</span>
            <span class="total-panel__count">${countLabel}</span>
          </div>
          <span class="total-panel__value">${brl(grupo.total)}</span>
        </div>
        <button class="btn btn--outline btn--sm" data-action="exportar" ${grupo.itens.length ? '' : 'disabled style="opacity:.5"'}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2 L10 13 M6 9.5 L10 13.5 L14 9.5" stroke="#1b4f9c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 15.5 L16.5 15.5" stroke="#1b4f9c" stroke-width="2" stroke-linecap="round"/></svg>
          Exportar para o acerto
        </button>
      </div>
    </div>`;
  }

  // ============================================================
  // ROTEADOR + RENDER
  // ============================================================
  function render() {
    const hash = location.hash || '#/lista';
    let html;
    if (hash.startsWith('#/nova')) html = screenNova();
    else if (hash.startsWith('#/conferir')) html = screenConferir();
    else if (hash.startsWith('#/nota/')) html = screenDetalhe(Number(hash.split('/')[2]));
    else if (hash.startsWith('#/relatorio')) html = screenRelatorio();
    else html = screenLista();
    app.innerHTML = html;

    // foco automatico do input de busca sem roubar o cursor a cada tecla
    if (hash === '#/lista' || hash === '' || hash === '#/') { /* nao auto-focar para nao abrir teclado */ }
  }

  // ============================================================
  // EVENTOS
  // ============================================================
  function novoDraft() {
    return { foto: null, processando: false, cliente: '', placa: '', data: toISO(hoje()), distribuidora: '', itens: [{ nome: '', valor: '', meses: 6 }] };
  }

  // Le os campos do formulario para o draft (antes de re-render)
  function coletarConferir() {
    const d = state.draft; if (!d) return;
    const g = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    d.cliente = g('f-cliente');
    d.placa = g('f-placa');
    d.data = g('f-data') || toISO(hoje());
    d.distribuidora = g('f-distribuidora');
    document.querySelectorAll('.item-edit').forEach((row) => {
      const i = Number(row.dataset.idx);
      if (!d.itens[i]) return;
      d.itens[i].nome = row.querySelector('.i-nome').value;
      d.itens[i].valor = parseFloat(String(row.querySelector('.i-valor').value).replace(',', '.')) || 0;
      d.itens[i].meses = Number(row.querySelector('.i-meses').value);
    });
  }

  // Delegação de cliques
  app.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    const idx = el.dataset.idx != null ? Number(el.dataset.idx) : null;

    switch (action) {
      case 'nova':
        state.draft = novoDraft();
        go('#/nova');
        break;
      case 'voltar':
        voltar();
        break;
      case 'relatorio':
        state.mesIdx = 0;
        go('#/relatorio');
        break;
      case 'open-nota':
        go('#/nota/' + el.dataset.id);
        break;
      case 'clear-search':
        state.query = '';
        render();
        break;

      // ----- Camera -----
      case 'capture':
      case 'galeria':
        cameraInput.click();
        break;

      // ----- Conferir (form) -----
      case 'add-item':
        coletarConferir();
        state.draft.itens.push({ nome: '', valor: '', meses: 6 });
        render();
        break;
      case 'del-item':
        coletarConferir();
        state.draft.itens.splice(idx, 1);
        if (!state.draft.itens.length) state.draft.itens.push({ nome: '', valor: '', meses: 6 });
        render();
        break;
      case 'salvar':
        salvarNota();
        break;

      // ----- Detalhe / sheet -----
      case 'open-item':
        state.sel = idx;
        render();
        break;
      case 'close-sheet': {
        // Fecha só se o toque foi no fundo escuro ou no botão Cancelar,
        // não em cliques dentro do corpo do sheet.
        const onBackdrop = e.target.classList && e.target.classList.contains('sheet-backdrop');
        const onCancel = !!e.target.closest('.btn--ghost');
        if (onBackdrop || onCancel) { state.sel = null; render(); }
        break;
      }
      case 'acionar':
        mudarStatusItem(idx, 'Acionada');
        break;
      case 'devolver':
        mudarStatusItem(idx, 'Devolvida');
        break;
      case 'reabrir':
        mudarStatusItem(idx, null);
        break;

      // ----- Relatorio -----
      case 'mes-prev':
        state.mesIdx = state.mesIdx + 1;
        render();
        break;
      case 'mes-next':
        state.mesIdx = Math.max(0, state.mesIdx - 1);
        render();
        break;
      case 'exportar':
        exportarRelatorio();
        break;
    }
  });

  // Busca (input)
  app.addEventListener('input', (e) => {
    if (e.target.id === 'search') {
      state.query = e.target.value;
      // atualiza só a lista sem re-render total para não perder o foco do input
      const clearBtn = e.target.parentElement;
      clearBtn.classList.toggle('has-text', !!e.target.value);
      atualizarLista();
    }
  });

  // Atualiza só o bloco de conteúdo da lista (mantém foco no campo de busca)
  function atualizarLista() {
    const temp = document.createElement('div');
    temp.innerHTML = screenLista();
    const novoContent = temp.querySelector('.content');
    const atual = app.querySelector('.content');
    if (novoContent && atual) atual.replaceWith(novoContent);
  }

  // ----- Câmera: recebe a foto escolhida/tirada -----
  cameraInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    cameraInput.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (!state.draft) state.draft = novoDraft();
      state.draft.foto = reader.result;
      state.draft.processando = true;
      render();
      // pequena simulação de "guardando/processando" e segue pro formulário
      setTimeout(() => {
        state.draft.processando = false;
        go('#/conferir');
      }, 1100);
    };
    reader.readAsDataURL(file);
  });

  // ----- Ações de dados -----
  async function salvarNota() {
    coletarConferir();
    const d = state.draft;
    if (!d.cliente.trim()) { toast('Informe o cliente.'); return; }
    if (!d.itens.some((it) => it.nome.trim())) { toast('Adicione ao menos uma peça.'); return; }

    const numero = novoId();
    const nota = {
      id: Date.now(),
      numero,
      cliente: d.cliente.trim(),
      placa: d.placa.trim().toUpperCase(),
      data: d.data,
      distribuidora: d.distribuidora.trim(),
      foto: d.foto,
      itens: d.itens.filter((it) => it.nome.trim()).map((it, i) => ({
        id: i + 1, nome: it.nome.trim(), valor: Number(it.valor) || 0, meses: Number(it.meses) || 0, status: null
      }))
    };
    state.notas.unshift(nota);
    await persist();
    state.draft = null;
    toast('Garantia salva ✓', true);
    // Troca o fluxo câmera→conferir por "lista" no histórico e abre o detalhe,
    // assim o botão voltar leva para a lista (e não de volta para a câmera).
    location.replace('#/lista');
    go('#/nota/' + nota.id);
  }

  async function mudarStatusItem(idx, novo) {
    const id = Number(location.hash.split('/')[2]);
    const nota = state.notas.find((n) => n.id === id);
    if (!nota || !nota.itens[idx]) return;
    const it = nota.itens[idx];
    it.status = novo;
    if (novo === 'Acionada') it.acionadaEm = toISO(hoje());
    else if (novo === 'Devolvida') it.devolvidaEm = toISO(hoje());
    else { delete it.acionadaEm; delete it.devolvidaEm; }
    await persist();
    state.sel = null;
    render();
    if (novo === 'Devolvida') toast('Item devolvido ✓', true);
    else if (novo === 'Acionada') toast('Item acionado ✓', true);
    else toast('Garantia reaberta', true);
  }

  function exportarRelatorio() {
    // Monta CSV do mês visível e tenta compartilhar; senão, baixa o arquivo.
    const grupos = {};
    state.notas.forEach((n) => n.itens.forEach((it) => {
      if (it.status === 'Devolvida' && it.devolvidaEm) {
        const d = fromISO(it.devolvidaEm);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        (grupos[key] = grupos[key] || { label: MES_NOMES[d.getMonth()] + ' ' + d.getFullYear(), linhas: [] }).linhas.push(
          [it.nome, n.cliente.split('·')[0].trim(), fmtBR(it.devolvidaEm), Number(it.valor || 0).toFixed(2)]
        );
      }
    }));
    const keys = Object.keys(grupos).sort().reverse();
    if (!keys.length) return;
    const idx = Math.max(0, Math.min(state.mesIdx, keys.length - 1));
    const g = grupos[keys[idx]];
    const total = g.linhas.reduce((s, l) => s + Number(l[3]), 0);
    let csv = 'Peça;Cliente;Devolvida em;Valor\n';
    g.linhas.forEach((l) => { csv += l.join(';') + '\n'; });
    csv += 'TOTAL;;;' + total.toFixed(2) + '\n';

    const nomeArq = 'devolucoes-' + keys[idx] + '.csv';
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const file = new File([blob], nomeArq, { type: 'text/csv' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Devoluções ' + g.label }).catch(() => {});
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = nomeArq; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('Arquivo exportado ✓', true);
    }
  }

  // ============================================================
  // SEED (dados de exemplo na primeira abertura)
  // ============================================================
  function seed() {
    const h = hoje();
    const diasAtras = (n) => { const d = new Date(h); d.setDate(d.getDate() - n); return toISO(d); };
    const noMes = (offMes, dia) => { const d = new Date(h.getFullYear(), h.getMonth() - offMes, dia); return toISO(d); };

    return [
      {
        id: 1, numero: 1042, cliente: 'João Silva · (16) 99812-4407', placa: 'ABC1D23',
        data: diasAtras(175), distribuidora: 'Comercial Refon · NF 88.204', foto: null,
        itens: [
          { id: 1, nome: 'Bandeja L.D.', valor: 420, meses: 6, status: null },
          { id: 2, nome: 'Amortecedor D.D.', valor: 380, meses: 12, status: null },
          { id: 3, nome: 'Kit pivô', valor: 260, meses: 6, status: null },
          { id: 4, nome: 'Pastilha dianteira', valor: 190, meses: 3, status: 'Acionada', acionadaEm: noMes(0, Math.min(h.getDate(), 3)) },
          { id: 5, nome: 'Terminal de direção', valor: 210, meses: 3, status: 'Devolvida', devolvidaEm: noMes(0, Math.min(h.getDate(), 5)) },
          { id: 6, nome: 'Óleo 5W30 (4L)', valor: 160, meses: 0, status: null },
          { id: 7, nome: 'Filtro de óleo', valor: 45, meses: 0, status: null }
        ]
      },
      {
        id: 2, numero: 1041, cliente: 'Oficina do Tião · (16) 99640-1187', placa: 'HGF4D21',
        data: diasAtras(88), distribuidora: 'Auto Distribuidora Sul · NF 12.907', foto: null,
        itens: [
          { id: 1, nome: 'Kit embreagem', valor: 520, meses: 3, status: null },
          { id: 2, nome: 'Disco de embreagem', valor: 180, meses: 3, status: null },
          { id: 3, nome: 'Rolamento', valor: 95, meses: 6, status: null }
        ]
      },
      {
        id: 3, numero: 1040, cliente: 'Transportes Rocha · (16) 3512-0088', placa: 'RTA3C55',
        data: diasAtras(20), distribuidora: 'Comercial Refon · NF 88.560', foto: null,
        itens: [
          { id: 1, nome: 'Alternador — HB20', valor: 640, meses: 12, status: null },
          { id: 2, nome: 'Correia dentada', valor: 90, meses: 6, status: null }
        ]
      },
      {
        id: 4, numero: 1039, cliente: 'Ana Costa · (16) 99177-2043', placa: 'GHJ7K89',
        data: diasAtras(10), distribuidora: 'Peças Já · NF 04.220', foto: null,
        itens: [
          { id: 1, nome: 'Óleo + filtro', valor: 205, meses: 0, status: null },
          { id: 2, nome: 'Bomba d’água', valor: 220, meses: 6, status: null }
        ]
      },
      {
        id: 5, numero: 1035, cliente: 'R. Lima · (16) 99055-7781', placa: 'LMN2P33',
        data: diasAtras(60), distribuidora: 'Auto Distribuidora Sul · NF 12.740', foto: null,
        itens: [
          { id: 1, nome: 'Correia dentada', valor: 100, meses: 6, status: 'Devolvida', devolvidaEm: noMes(1, 12) },
          { id: 2, nome: 'Bico injetor', valor: 190, meses: 12, status: 'Devolvida', devolvidaEm: noMes(1, 8) },
          { id: 3, nome: 'Sensor de rotação', valor: 140, meses: 6, status: null }
        ]
      }
    ];
  }

  // ============================================================
  // BOOT
  // ============================================================
  window.addEventListener('hashchange', render);

  (async function init() {
    let notas = await window.DB.loadNotas();
    if (!notas) { notas = seed(); await window.DB.saveNotas(notas); }
    state.notas = notas;
    if (!location.hash) location.replace('#/lista');
    render();
  })();
})();
