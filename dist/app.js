'use strict';
const $ = id => document.getElementById(id);
const schoolNetworks = { municipal: 'Municipal', estadual: 'Estadual', particular: 'Escola particular' };
const networks = { ...schoolNetworks, individual: 'Alunos particulares' };
const statusNames = { class: 'Aula prevista', pending: 'A confirmar', holiday: 'Feriado', recess: 'Recesso', vacation: 'Férias', closed: 'Sem aula', unscheduled: 'Sem aula na grade' };
const icons = {
    book: '<path d="M5 4h13v16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2m0 12h12M8 8h6m-6 4h4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-13 5h2m4 0h2"/>',
    document: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/>',
    pin: '<path d="M20 10c0 5-8 10-8 10S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    upload: '<path d="M12 15V4m-4 4 4-4 4 4M4 15v5h16v-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    cross: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>'
};
const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + '</svg>';
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const municipalUrl = 'https://legislacao.prefeitura.sp.gov.br/instrucao-normativa-secretaria-municipal-de-educacao-sme-49-de-28-de-novembro-de-2025/consolidado';
const state26 = 'https://atendimento.educacao.sp.gov.br/knowledgebase/article/SED-08404/pt-br';
const state27 = 'https://dgui.cps.sp.gov.br/dgui_atos_normativos/seduc-80/';
const holidaysUrl = 'https://prefeitura.sp.gov.br/web/gestao/w/calendario_2026';
const base = {
    'municipal-2026': {
        title: 'IN SME nº 49/2025 · Ensino Fundamental e Médio', url: municipalUrl, term: ['02-04', '12-22'], dates: [
            ['01-02', '01-31', 'vacation', 'Férias escolares'], ['02-16', '02-17', 'closed', 'Carnaval'], ['02-18', '02-18', 'pending', 'Quarta-feira de Cinzas'], ['02-28', '02-28', 'class', 'Dia da Família · reposição de 20/04'], ['04-20', '04-20', 'closed', 'Dia letivo reposto no Dia da Família'], ['06-05', '06-05', 'pending', 'Suspensão de expediente · confirme com a escola'], ['07-06', '07-17', 'recess', 'Recesso escolar'], ['10-09', '10-09', 'holiday', 'Dia do Professor · feriado escolar antecipado'], ['10-30', '10-30', 'pending', 'Ponto facultativo · confirme com a escola'], ['12-23', '12-31', 'recess', 'Recesso de fim de ano']
        ]
    },
    'estadual-2026': {
        title: 'SEDUC-SP · Calendário escolar de 2026', url: state26, term: ['02-02', '12-18'], dates: [
            ['01-02', '01-16', 'vacation', 'Férias docentes'], ['01-17', '01-31', 'recess', 'Recesso escolar'], ['02-16', '02-18', 'pending', 'Carnaval e Cinzas · confirme com a escola'], ['04-20', '04-20', 'pending', 'Ponto facultativo · confirme com a escola'], ['06-05', '06-05', 'pending', 'Ponto facultativo · confirme com a escola'], ['10-30', '10-30', 'pending', 'Ponto facultativo · confirme com a escola'], ['07-07', '07-21', 'vacation', 'Férias docentes'], ['02-19', '02-20', 'pending', 'Planejamento · confirme as aulas com a escola'], ['07-22', '07-23', 'closed', 'Replanejamento'], ['12-19', '12-31', 'recess', 'Recesso de fim de ano']
        ]
    },
    'estadual-2027': {
        title: 'Resolução SEDUC nº 80/2026', url: state27, term: ['02-11', '12-22'], dates: [
            ['01-04', '01-18', 'vacation', 'Férias docentes'], ['01-19', '02-03', 'recess', 'Recesso escolar'], ['06-24', '07-06', 'pending', 'Confirme possíveis ajustes do calendário de julho'], ['07-07', '07-21', 'vacation', 'Férias docentes'], ['07-22', '07-25', 'closed', 'Replanejamento e intervalo entre semestres'], ['12-23', '12-31', 'recess', 'Recesso de fim de ano']
        ]
    }
};
const fixedHolidays = {
    '01-01': 'Confraternização Universal', '01-25': 'Aniversário de São Paulo', '04-21': 'Tiradentes', '05-01': 'Dia do Trabalho', '07-09': 'Revolução Constitucionalista', '09-07': 'Independência do Brasil', '10-12': 'Nossa Senhora Aparecida', '11-02': 'Finados', '11-15': 'Proclamação da República', '11-20': 'Consciência Negra', '12-25': 'Natal'
};
const monthNames = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, i, 1))));
const weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const weekOrder = [1, 2, 3, 4, 5, 6, 0];
const weekdayOf = date => new Date(date + 'T00:00:00Z').getUTCDay();
const cap = text => text.charAt(0).toUpperCase() + text.slice(1);
const iso = (year, month, day) => new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
function holidayName(date) {
    const fixed = fixedHolidays[date.slice(5)];
    if (fixed) return fixed;
    const y = Number(date.slice(0, 4));
    // Computus gregoriano para localizar a Páscoa e seus feriados móveis.
    const century = Math.floor(y / 100);
    const yearInCentury = y % 100;
    const moon = (19 * (y % 19) + century - Math.floor(century / 4) - Math.floor((century - Math.floor((century + 8) / 25) + 1) / 3) + 15) % 30;
    const weekday = (32 + 2 * (century % 4) + 2 * Math.floor(yearInCentury / 4) - moon - (yearInCentury % 4)) % 7;
    const correction = Math.floor(((y % 19) + 11 * moon + 22 * weekday) / 451);
    const paschal = moon + weekday - 7 * correction + 114;
    const easterMonth = Math.floor(paschal / 31) - 1;
    const easterDay = paschal % 31 + 1;
    if (date === iso(y, easterMonth, easterDay - 2)) return 'Paixão de Cristo';
    if (date === iso(y, easterMonth, easterDay + 60)) return 'Corpus Christi';
    return '';
}
const br = date => date.split('-').reverse().join('/');
const initialSchools = Object.keys(schoolNetworks).map(network => ({ id: network, name: 'Calendário de referência', network, schedule: [0, 1, 1, 1, 1, 1, 0] }));
let state = { schools: initialSchools, records: {}, rules: [], selected: {}, classes: [], lessons: [] };
let revision;
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
let [year, currentMonth] = today.split('-').map(Number);
let month = currentMonth - 1;
let network = 'municipal';
let page = 'diary';
let pageBeforeDashboard = 'diary';
let view = 'month';
let period = 'all';
let weekdayFilter = 'all';
let editSchoolId = '';
let editDate = '';
let editRule = '';
let toastTimer;
const selectSchool = () => state.schools.find(s => s.id === state.selected[network] && s.network === network) ?? state.schools.find(s => s.network === network);
const isIndividual = school => school?.network === 'individual';
const isReference = school => Boolean(school && school.id === school.network);
const schoolSchedule = (school, date) => school.scheduleHistory?.findLast(entry => entry.start <= date)?.schedule ?? school.schedule ?? [0, 0, school.quantity, 0, 0, 0, 0];
const agenda = (date, school = selectSchool()) => {
    const key = school.id + '|' + date;
    return { ...state.records[key], key };
};
const option = (id, label) => '<option value="' + escape(id) + '">' + escape(label) + '</option>';
const pill = (type, label = statusNames[type]) => '<span class="pill ' + type + '">' + label + '</span>';
function toast(message) {
    $('toast').textContent = message;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3200);
}
async function commit(next) {
    let error;
    try {
        const saved = await diaryStorage.save(revision, next);
        if (saved) {
            revision = saved.revision;
            state = saved.data;
            return true;
        }
        error = 'Outra aba salvou alterações. Recarregue a página antes de salvar novamente.';
    } catch {
        error = 'O navegador não conseguiu salvar os dados.';
    }
    const field = document.querySelector('dialog[open] .error');
    if (field) field.textContent = error;
    else toast(error);
    return false;
}
function dateStatus(date, school, record) {
    const short = date.slice(5);
    const holiday = holidayName(date);
    if (holiday) return { type: 'holiday', label: holiday };
    if (record?.override) return { type: record.override, label: record.note || 'Ajuste da escola' };
    const calendar = base[school.network + '-' + date.slice(0, 4)];
    const scope = state.rules.filter(r => (r.target === school.network || r.target === school.id) && r.start.slice(0, 4) === date.slice(0, 4));
    const schoolRules = scope.filter(r => r.target === school.id);
    const networkRules = scope.filter(r => r.target === school.network && r.target !== school.id);
    const matches = r => date >= r.start && date <= r.end;
    const schoolTerms = schoolRules.filter(r => r.type === 'term');
    const terms = schoolTerms.length ? schoolTerms : networkRules.filter(r => r.type === 'term');
    const schoolException = schoolRules.findLast(r => r.type !== 'term' && matches(r));
    if (schoolException) return schoolException;
    if (schoolTerms.length && !terms.some(matches)) return { type: 'closed', label: 'Fora do período letivo da escola' };
    const networkException = networkRules.findLast(r => r.type !== 'term' && matches(r));
    if (networkException) return networkException;
    if (terms.length && !terms.some(matches)) return { type: 'closed', label: 'Fora do período letivo atualizado' };
    const quantity = schoolSchedule(school, date)[weekdayOf(date)];
    const special = calendar?.dates.find(([start, end]) => short >= start && short <= end);
    if (special && (!schoolTerms.length || special[2] === 'holiday')) {
        const type = special[2];
        if (type !== 'pending' && type !== 'class' || quantity || (type === 'class' && isReference(school))) return { type, label: special[3] };
    }
    if (!quantity) return { type: 'unscheduled', label: 'Sem aulas regulares neste dia' };
    if (terms.length) return { type: 'class', label: 'Período letivo atualizado' };
    if (!calendar) return { type: 'pending', label: 'Calendário da escola pendente' };
    if (short < calendar.term[0] || short > calendar.term[1]) return { type: 'closed', label: 'Fora do período letivo' };
    return { type: 'class', label: 'Dia letivo na base da rede' };
}
function bounds() {
    if (period === 'first') return [year + '-01-01', year + '-06-30'];
    if (period === 'second') return [year + '-07-01', year + '-12-31'];
    if (period === 'custom') return [$('from').value, $('to').value];
    return [year + '-01-01', year + '-12-31'];
}
function allRows() {
    const [start, end] = bounds();
    if (!start || !end || start > end) return [];
    const school = selectSchool();
    if (!school) return [];
    const lessonsByDate = new Map();
    for (const lesson of state.lessons) {
        if (lesson.schoolId !== school.id || lesson.date < start || lesson.date > end) continue;
        if (!lessonsByDate.has(lesson.date)) lessonsByDate.set(lesson.date, []);
        lessonsByDate.get(lesson.date).push(lesson);
    }
    const rows = [];
    const day = new Date(start + 'T00:00:00Z');
    for (; day.toISOString().slice(0, 10) <= end; day.setUTCDate(day.getUTCDate() + 1)) {
        const weekday = day.getUTCDay();
        if (weekdayFilter !== 'all' && weekday !== Number(weekdayFilter)) continue;
        const date = day.toISOString().slice(0, 10);
        const record = agenda(date, school);
        const lessons = lessonsByDate.get(date) ?? [];
        const activeLessons = lessons.filter(lesson => lesson.status !== 'cancelled');
        const calendar = isIndividual(school) ? { type: 'unscheduled', label: 'Sem aulas no diário' } : dateStatus(date, school, record);
        const status = activeLessons.length && calendar.type !== 'class' ? { type: 'class', label: 'Aula no diário' } : calendar;
        const regular = calendar.type === 'class' ? schoolSchedule(school, date)[weekday] || 1 : 0;
        rows.push({ date, weekday, quantity: Math.max(regular, activeLessons.length), record, lessons, ...status });
    }
    return rows;
}
const activeMonths = () => {
    const [start, end] = bounds();
    if (!start || !end || start > end) return [];
    return monthNames.map((_, i) => i).filter(i => iso(year, i, 1) <= end && iso(year, i + 1, 0) >= start);
};
const shownMonth = row => Number(row.date.slice(5, 7)) === month + 1;
const classCount = rows => rows.reduce((total, row) => total + (row.type === 'class' ? row.quantity : 0), 0);
const count = (rows, type) => rows.filter(r => r.type === type).length;
function render() {
    for (const button of $('networks').querySelectorAll('[data-network]')) {
        button.setAttribute('aria-pressed', page !== 'dashboard' && network === button.dataset.network);
    }
    if (page === 'dashboard') {
        renderDashboard();
        return;
    }
    const school = selectSchool();
    const individual = network === 'individual';
    $('school').innerHTML = state.schools.filter(s => s.network === network).map(s => option(s.id, s.name)).join('') || option('', 'Nenhum aluno cadastrado');
    $('school').value = school?.id ?? '';
    $('school').disabled = !school;
    $('scopeLabel').textContent = individual ? 'Aluno' : 'Escola';
    $('addSchoolLabel').textContent = individual ? 'Novo aluno particular' : 'Nova escola';
    $('editSchool').textContent = individual ? 'Editar aluno' : 'Editar escola';
    $('editSchool').hidden = !school;
    $('year').value = $('sourceYear').value = year;
    $('period').value = period;
    $('range').hidden = page !== 'calendar' || period !== 'custom';
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === view));
    renderDiary(school);
    renderCalendar(school);
}

function renderCalendar(school) {
    const months = activeMonths();
    if (!months.includes(month) && months.length) month = months[0];
    const rows = allRows();
    const scheduled = classCount(rows);
    $('weekday').value = weekdayFilter;
    const pending = count(rows, 'pending');
    const detailed = rows.flatMap(row => row.lessons.filter(lesson => lesson.status === 'held'));
    const call = summarizeAttendance(detailed);
    const present = rows.filter(r => r.record.attendance === 'present').length;
    const absent = rows.filter(r => r.record.attendance === 'absent').length;
    const individual = isIndividual(school);
    const metrics = individual ? [
        ['calendar', scheduled, 'Aulas no período'], ['clock', countLessons(rows, 'scheduled'), 'Aulas agendadas'],
        ['check', call.present, 'Presenças na chamada'], ['cross', call.absent + call.excused, 'Faltas na chamada']
    ] : [
        ['calendar', scheduled, 'Aulas previstas no período'], ['clock', pending, 'Datas a confirmar'],
        ['check', present, 'Dias com presença'], ['cross', absent, 'Dias com falta']
    ];
    $('stats').innerHTML = metrics.map(([symbol, n, label]) => '<div class="metric"><i>' + icon(symbol) + '</i><div><strong>' + n + '</strong><small>' + label + '</small></div></div>').join('');
    const hasTerm = state.rules.some(r => r.type === 'term' && (r.target === network || r.target === school?.id) && r.start.startsWith(year + '-'));
    let notice = '';
    if (!months.length) notice = 'Selecione um intervalo válido dentro do ano letivo.';
    else if (school && !individual) {
        if (!base[network + '-' + year] && !hasTerm) notice = network === 'particular' ? 'Cadastre o calendário da escola em Fontes ou agende as aulas no diário.' : 'A base oficial deste ano ainda precisa ser cadastrada. As datas sem confirmação ficam fora do total.';
        else if (network === 'estadual' && year === 2027) notice = 'Confirme ajustes de julho e suspensões específicas com a escola.';
    }
    $('notice').innerHTML = notice ? icon('clock') + '<span>' + notice + '</span>' : '';
    $('monthControls').hidden = view !== 'month' || !months.length;
    $('prev').disabled = months.indexOf(month) <= 0;
    $('next').disabled = months.indexOf(month) >= months.length - 1;
    $('calendarTitle').textContent = view === 'month' ? cap(monthNames[month]) + ' de ' + year : 'Visão anual · ' + year;
    $('calendarCaption').textContent = school ? school.name + ' · ' + (weekdayFilter === 'all' ? 'Todos os dias' : cap(weekdays[Number(weekdayFilter)])) : '';
    if (!school) $('calendarContent').innerHTML = '<p class="empty">Cadastre um aluno particular para acompanhar as aulas.</p>';
    else if (!months.length) $('calendarContent').innerHTML = '<p class="empty">Nenhuma data no intervalo selecionado.</p>';
    else if (view === 'year') $('calendarContent').innerHTML = '<div class="year-grid">' + months.map(i => {
        const list = rows.filter(row => Number(row.date.slice(5, 7)) === i + 1);
        const n = classCount(list);
        const waiting = count(list, 'pending');
        return '<button class="month-card" data-month="' + i + '"><strong>' + cap(monthNames[i]) + '</strong><span>' + n + ' ' + (n === 1 ? 'aula prevista' : 'aulas previstas') + '</span><span class="pending-count">' + waiting + ' a confirmar</span></button>';
    }).join('') + '</div>';
    else {
        const list = rows.filter(shownMonth);
        const monthlyClasses = classCount(list);
        $('calendarCaption').textContent += ' · ' + monthlyClasses + (monthlyClasses === 1 ? ' aula prevista no mês' : ' aulas previstas no mês');
        $('calendarContent').innerHTML = list.length ? '<div class="table-wrap"><table aria-label="Calendário de aulas"><thead><tr><th scope="col">Data</th><th scope="col">Dia da semana</th><th scope="col">Calendário</th><th scope="col">Aulas</th><th scope="col">Frequência</th><th scope="col">Registro</th></tr></thead><tbody>' + list.map(r => {
            const att = r.record.attendance;
            const frequency = att === 'present' ? pill('present', 'Presença') : att === 'absent' ? pill('absent', r.record.excused ? 'Falta justificada' : 'Falta') : attendanceSummary(summarizeAttendance(r.lessons));
            const label = r.type === 'class' && (r.record.override === 'class' || r.label === 'Aula confirmada') ? 'Aula confirmada' : statusNames[r.type];
            const edit = individual ? '' : '<button class="plain table-action" data-date="' + r.date + '" aria-label="Editar ' + br(r.date) + '">Editar dia</button>';
            const diary = isReference(school) ? '' : '<button class="plain table-action" data-lesson-date="' + r.date + '">' + (r.lessons.length ? 'Ver aulas (' + r.lessons.length + ')' : 'Nova aula') + '</button>';
            return '<tr><td><strong>' + br(r.date) + '</strong></td><td>' + cap(weekdays[r.weekday]) + '</td><td>' + pill(r.type, label) + '<small>' + escape(r.label) + '</small></td><td>' + (r.type === 'class' ? r.quantity : '—') + '</td><td>' + frequency + '</td><td><div class="actions">' + edit + diary + '</div></td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="empty">Nenhuma data neste mês para o filtro selecionado.</p>';
    }
}

const countLessons = (rows, status) => rows.reduce((total, row) => total + row.lessons.filter(lesson => lesson.status === status).length, 0);
function sourceLink(url, label) {
    return '<a href="' + escape(url) + '" target="_blank" rel="noopener noreferrer">' + escape(label) + '</a>';
}
function renderSources() {
    const target = $('ruleTarget').value;
    $('sourceYear').value = year;
    const sources = Object.entries(schoolNetworks).map(([id, label]) => {
        const entry = base[id + '-' + year];
        const fallback = id === 'municipal' ? 'https://educacao.sme.prefeitura.sp.gov.br/' : id === 'estadual' ? 'https://www.educacao.sp.gov.br/' : null;
        const summary = entry ? sourceLink(entry.url, entry.title) : fallback ? sourceLink(fallback, 'Consultar publicações da Secretaria') : 'Consulte o calendário oficial da escola.';
        return '<div class="source-row"><strong>' + label + '</strong>' + summary + '</div>';
    });
    if (year === 2026) sources.push('<div class="source-row"><strong>Pontos facultativos estaduais</strong>' + sourceLink('https://www.al.sp.gov.br/repositorio/legislacao/decreto/2025/decreto-70273-23.12.2025.html', 'Decreto estadual nº 70.273/2025') + ' · ' + sourceLink('https://www.al.sp.gov.br/repositorio/legislacao/decreto/2026/decreto-70925-02.10.2026.html', 'Alteração do Dia do Servidor Público') + '</div>');
    sources.push('<div class="source-row"><strong>Feriados na capital</strong>' + sourceLink(holidaysUrl, 'Prefeitura de São Paulo · referência 2026') + '<div class="muted">Feriados fixos e móveis são aplicados automaticamente. Cadastre suspensões e pontos facultativos conforme o calendário escolar.</div></div>');
    $('sourceList').innerHTML = sources.join('');
    $('ruleTarget').innerHTML = '<optgroup label="Base por rede">' + Object.entries(schoolNetworks).map(([id, label]) => option(id, 'Rede ' + label.toLowerCase())).join('') + '</optgroup><optgroup label="Escolas cadastradas">' + state.schools.filter(s => !isReference(s) && !isIndividual(s)).map(s => option(s.id, s.name + ' · ' + networks[s.network])).join('') + '</optgroup>';
    $('ruleTarget').value = target && Array.from($('ruleTarget').options).some(o => o.value === target) ? target : schoolNetworks[network] ? network : 'municipal';
    const labels = { ...statusNames, term: 'Período letivo completo' };
    const rules = state.rules.filter(r => r.start.startsWith(year + '-'));
    $('rules').innerHTML = rules.length ? '<h3>Atualizações de ' + year + '</h3>' + rules.map(r => {
        const targetName = networks[r.target] ? 'Rede ' + networks[r.target].toLowerCase() : state.schools.find(s => s.id === r.target)?.name;
        return '<div class="source-row"><strong>' + escape(r.label) + '</strong><div class="muted">' + escape(targetName) + ' · ' + labels[r.type] + ' · ' + br(r.start) + ' a ' + br(r.end) + '</div>' + (r.url ? sourceLink(r.url, 'Ver documento') : '') + '<div class="rule-actions"><button class="plain" data-rule="' + r.id + '">Editar</button><button class="plain" data-remove="' + r.id + '">Remover</button></div></div>';
    }).join('') : '<p class="empty">Nenhuma atualização cadastrada para ' + year + '.</p>';
}
function switchPage(next) {
    if (next === 'dashboard' && (page === 'diary' || page === 'calendar')) pageBeforeDashboard = page;
    page = next;
    $('pageTitle').textContent = { diary: 'Diário de classe', calendar: 'Calendário', sources: 'Fontes e atualizações', dashboard: 'Dashboard' }[page];
    for (const name of ['diary', 'calendar', 'sources', 'dashboard']) {
        $(name + 'Page').hidden = name !== page;
        const button = $('go' + cap(name));
        button.classList.toggle('active', name === page);
        button.setAttribute('aria-current', name === page ? 'page' : 'false');
    }
    $('scope').hidden = page === 'sources';
    $('scopeFilters').hidden = page === 'dashboard';
    $('goDashboard').setAttribute('aria-pressed', page === 'dashboard');
    $('scope').classList.toggle('diary-scope', page === 'diary');
    document.querySelectorAll('.calendar-filter').forEach(el => { el.hidden = page !== 'calendar'; });
    if (page === 'sources') renderSources();
    render();
}
function syncDateInputs() {
    for (const id of ['from', 'to']) {
        $(id).min = year + '-01-01';
        $(id).max = year + '-12-31';
    }
    $('from').value = $('from').min;
    $('to').value = $('to').max;
}
function changeYear(event) {
    const value = event.target.valueAsNumber;
    if (!event.target.validity.valid || !Number.isInteger(value)) { event.target.value = year; return; }
    year = value;
    syncDateInputs();
    clearRule();
    render();
    renderSources();
}
$('year').onchange = $('sourceYear').onchange = changeYear;
$('goDiary').onclick = () => switchPage('diary');
$('goCalendar').onclick = () => switchPage('calendar');
$('goSources').onclick = () => switchPage('sources');
$('goDashboard').onclick = () => switchPage('dashboard');
$('networks').onclick = event => {
    const button = event.target.closest('[data-network]');
    if (!button) return;
    network = button.dataset.network;
    if (page === 'dashboard') switchPage(pageBeforeDashboard);
    else render();
};
$('school').onchange = event => {
    state = { ...state, selected: { ...state.selected, [network]: event.target.value } };
    render();
};
$('period').onchange = event => { period = event.target.value; render(); };
$('from').onchange = $('to').onchange = event => {
    if (!event.target.validity.valid) {
        event.target.value = event.target.id === 'from' ? event.target.min : event.target.max;
    }
    render();
};
document.querySelector('.switch').onclick = event => {
    const button = event.target.closest('[data-view]');
    if (button) { view = button.dataset.view; render(); }
};
const moveMonth = step => { const months = activeMonths(); month = months[months.indexOf(month) + step] ?? month; render(); };
$('prev').onclick = () => moveMonth(-1);
$('next').onclick = () => moveMonth(1);
$('weekday').innerHTML = option('all', 'Todos os dias') + weekOrder.map(day => option(day, cap(weekdays[day]))).join('');
$('weekday').onchange = event => { weekdayFilter = event.target.value; render(); };
function openSchool(school) {
    const form = $('schoolForm');
    form.reset();
    editSchoolId = school?.id ?? '';
    form.elements.name.value = school?.name ?? '';
    form.elements.name.readOnly = isReference(school);
    form.elements.network.value = school?.network ?? network;
    form.elements.network.disabled = Boolean(school);
    form.elements.scheduleStart.value = today;
    const schedule = school ? schoolSchedule(school, today) : [0, 0, 1, 0, 0, 0, 0];
    $('schoolSchedule').innerHTML = weekOrder.map(day => '<label>' + cap(weekdays[day]) + '<input name="day' + day + '" type="number" min="0" max="50" step="1" value="' + schedule[day] + '" required></label>').join('');
    $('removeSchool').hidden = !school || isReference(school);
    $('removeSchool').textContent = isIndividual(school) ? 'Excluir aluno' : 'Excluir escola';
    syncSchoolFields();
    $('schoolError').textContent = '';
    $('schoolDialog').showModal();
}

function syncSchoolFields() {
    const individual = $('schoolNetwork').value === 'individual';
    const edited = Boolean(editSchoolId);
    $('schoolTitle').textContent = individual ? (edited ? 'Editar aluno' : 'Novo aluno particular') : (edited ? 'Editar escola' : 'Nova escola');
    $('schoolNameLabel').textContent = individual ? 'Nome do aluno' : 'Nome da escola';
    $('saveSchool').textContent = edited ? 'Salvar alterações' : 'Adicionar cadastro';
    $('schoolScheduleFields').hidden = individual;
    $('schoolScheduleFields').disabled = individual;
    $('scheduleStartField').hidden = !edited;
    $('schoolForm').elements.scheduleStart.required = edited && !individual;
}

async function commitSchoolEdit(next) {
    $('saveSchool').disabled = $('removeSchool').disabled = true;
    const saved = await commit(next);
    $('saveSchool').disabled = $('removeSchool').disabled = false;
    return saved;
}

$('schoolNetwork').onchange = syncSchoolFields;
$('addSchool').onclick = () => openSchool();
$('editSchool').onclick = () => openSchool(selectSchool());
document.querySelectorAll('dialog .close').forEach(b => { b.onclick = () => b.closest('dialog').close(); });
$('schoolForm').onsubmit = async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = data.get('name').trim();
    if (!name) { $('schoolError').textContent = 'Informe um nome.'; return; }
    const existing = state.schools.find(s => s.id === editSchoolId);
    const school = existing ? { ...existing, name } : { id: newId(), name, network: data.get('network') };
    if (!isIndividual(school)) {
        const schedule = weekdays.map((_, day) => Number(data.get('day' + day)));
        if (!existing) school.schedule = schedule;
        else if (schedule.some((value, day) => value !== schoolSchedule(existing, data.get('scheduleStart'))[day])) {
            const start = data.get('scheduleStart');
            school.scheduleHistory = [...(existing.scheduleHistory ?? []).filter(entry => entry.start !== start), { start, schedule }].sort((a, b) => a.start.localeCompare(b.start));
        }
    }
    const schools = existing ? state.schools.map(s => s.id === school.id ? school : s) : [...state.schools, school];
    if (!await commitSchoolEdit({ ...state, schools, selected: { ...state.selected, [school.network]: school.id } })) return;
    network = school.network;
    $('schoolDialog').close();
    switchPage(existing && page === 'calendar' ? 'calendar' : 'diary');
    toast(existing ? 'Cadastro atualizado.' : isIndividual(school) ? 'Aluno cadastrado.' : 'Escola cadastrada.');
};

$('removeSchool').onclick = async () => {
    const school = state.schools.find(item => item.id === editSchoolId);
    if (!school || isReference(school)) return;

    const individual = isIndividual(school);
    const linkedData = individual
        ? 'As aulas e chamadas deste aluno também serão excluídas.'
        : 'As turmas, aulas, chamadas e registros de calendário desta escola também serão excluídos.';
    if (!confirm('Excluir “' + school.name + '”?\n\n' + linkedData)) return;

    const { id } = school;
    const rules = state.rules.filter(rule => rule.target !== id);
    const next = {
        ...state,
        schools: state.schools.filter(item => item.id !== id),
        classes: state.classes.filter(group => group.schoolId !== id),
        lessons: state.lessons.filter(lesson => lesson.schoolId !== id),
        records: Object.fromEntries(Object.entries(state.records).filter(([key]) => !key.startsWith(id + '|'))),
        rules,
        selected: Object.fromEntries(Object.entries(state.selected).filter(([, selectedId]) => selectedId !== id))
    };
    if (!await commitSchoolEdit(next)) return;

    if (ruleForm.elements.target.value === id || (editRule && !rules.some(rule => rule.id === editRule))) clearRule();
    $('schoolDialog').close();
    render();
    (selectSchool() ? $('editSchool') : $('addSchool')).focus();
    toast(individual ? 'Aluno excluído.' : 'Escola excluída.');
};

const newId = () => crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
function syncAttendance() {
    const form = $('dateForm').elements;
    $('absenceFields').hidden = form.attendance.value !== 'absent';
    $('overrideLabel').hidden = !form.override.value;
}
function openDate(date) {
    editDate = date;
    const record = agenda(date);
    const original = dateStatus(date, selectSchool());
    $('dateTitle').textContent = cap(weekdays[weekdayOf(date)]) + ' · ' + br(date);
    $('dateBase').textContent = 'Calendário base · ' + original.label;
    const fields = $('dateForm').elements;
    fields.override.value = record.override ?? '';
    fields.override.disabled = Boolean(holidayName(date));
    fields.note.value = record.note ?? '';
    fields.attendance.value = record.attendance ?? '';
    fields.reason.value = record.reason ?? '';
    fields.excused.checked = Boolean(record.excused);
    $('dateError').textContent = '';
    syncAttendance();
    $('dateDialog').showModal();
}
$('calendarContent').onclick = event => {
    const card = event.target.closest('[data-month]');
    const button = event.target.closest('[data-date]');
    const lesson = event.target.closest('[data-lesson-date]');
    if (card) { month = Number(card.dataset.month); view = 'month'; render(); }
    if (button) openDate(button.dataset.date);
    if (lesson) openDiaryDate(lesson.dataset.lessonDate);
};
$('dateForm').onchange = syncAttendance;
$('dateForm').onsubmit = async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const override = data.get('override') ?? '';
    const attendance = data.get('attendance');
    const candidate = { override, note: override ? data.get('note').trim() : '', attendance, reason: attendance === 'absent' ? data.get('reason').trim() : '', excused: attendance === 'absent' && data.has('excused') };
    const alreadyRecorded = agenda(editDate).attendance;
    if (attendance && dateStatus(editDate, selectSchool(), candidate).type !== 'class' && attendance !== alreadyRecorded) {
        $('dateError').textContent = 'Confirme a aula para lançar a frequência nesta data.';
        return;
    }
    const records = { ...state.records };
    const { key } = agenda(editDate);
    if (override || attendance) records[key] = candidate;
    else delete records[key];
    if (!await commit({ ...state, records })) return;
    $('dateDialog').close();
    render();
    toast('Registro salvo. Totais atualizados.');
};
const ruleForm = $('ruleForm');
function clearRule() {
    editRule = '';
    ruleForm.reset();
    ruleForm.elements.start.value = ruleForm.elements.end.value = '';
    $('cancelRule').hidden = true;
    $('ruleError').textContent = '';
}
$('cancelRule').onclick = () => { clearRule(); renderSources(); };
ruleForm.elements.start.onchange = () => {
    if (!ruleForm.elements.end.value) ruleForm.elements.end.value = ruleForm.elements.start.value;
};
ruleForm.onsubmit = async event => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(ruleForm));
    fields.label = fields.label.trim();
    if (!fields.label || fields.start > fields.end || !fields.start.startsWith(year + '-') || !fields.end.startsWith(year + '-') || (fields.url && !/^https?:\/\//i.test(fields.url))) {
        $('ruleError').textContent = 'Informe a descrição, datas em ordem dentro do ano selecionado e um link HTTP ou HTTPS, se houver.';
        return;
    }
    const rule = { ...fields, id: editRule || newId() };
    const rules = editRule ? state.rules.map(r => r.id === editRule ? rule : r) : [...state.rules, rule];
    if (!await commit({ ...state, rules })) return;
    clearRule();
    renderSources();
    render();
    toast('Atualização salva. Totais recalculados.');
};
$('rules').onclick = async event => {
    const edit = event.target.closest('[data-rule]');
    const remove = event.target.closest('[data-remove]');
    if (edit) {
        const rule = state.rules.find(r => r.id === edit.dataset.rule);
        editRule = rule.id;
        for (const field of ['target', 'type', 'start', 'end', 'label', 'url']) ruleForm.elements[field].value = rule[field];
        $('cancelRule').hidden = false;
        $('ruleError').textContent = '';
        $('ruleTarget').focus();
    }
    if (remove && confirm('Remover esta atualização do calendário?')) {
        if (!await commit({ ...state, rules: state.rules.filter(r => r.id !== remove.dataset.remove) })) return;
        if (editRule === remove.dataset.remove) clearRule();
        renderSources();
        render();
        toast('Atualização removida. Totais recalculados.');
    }
};
document.addEventListener('DOMContentLoaded', async () => {
    const main = document.querySelector('main');
    main.inert = true;
    main.setAttribute('aria-busy', 'true');
    try {
        const saved = await diaryStorage.load(state, 'tercas-letivas-v1');
        state = saved.data;
        revision = saved.revision;
    } catch {
        $('storageError').textContent = 'O navegador não conseguiu abrir o diário local. Verifique as permissões de armazenamento e recarregue a página.';
        $('storageError').hidden = false;
    }
    $('goDashboard').insertAdjacentHTML('beforebegin', Object.entries(networks).map(([id, label]) =>
        '<button type="button" data-network="' + id + '" aria-pressed="false">' + label + '</button>').join(''));
    syncDateInputs();
    switchPage(page);
    main.inert = false;
    main.removeAttribute('aria-busy');
});
