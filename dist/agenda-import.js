'use strict';

const importForm = $('importForm');
let importedSheets = [];
let readVersion = 0;
let readingImport = false;
let savingImport = false;

const headerKey = value => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();

function agendaDate(value, date1904) {
    let y, m, d;
    if (typeof value === 'number') {
        const parsed = XLSX.SSF.parse_date_code(value, { date1904 });
        if (!parsed) return '';
        ({ y, m, d } = parsed);
    } else {
        const text = String(value ?? '').trim();
        const brazilian = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
        const international = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
        if (brazilian) [, d, m, y] = brazilian.map(Number);
        else if (international) [, y, m, d] = international.map(Number);
        else return '';
    }
    if (y < 1900 || y > 2199 || m < 1 || m > 12 || d < 1 || d > 31) return '';
    const formatted = [y, String(m).padStart(2, '0'), String(d).padStart(2, '0')].join('-');
    return iso(y, m - 1, d) === formatted ? formatted : '';
}

function agendaAttendance(value) {
    const key = headerKey(value);
    if (['', 'false', '0', 'falso', 'nao', 'sem registro'].includes(key)) return '';
    if (['true', '1', 'verdadeiro', 'sim', 'presenca', 'presente', 'x'].includes(key)) return 'present';
    if (['falta', 'ausencia', 'ausente'].includes(key)) return 'absent';
    if (['falta justificada', 'ausencia justificada', 'justificada'].includes(key)) return 'excused';
    return null;
}

function parseAgenda(buffer) {
    const workbook = XLSX.read(buffer, { type: 'array', cellFormula: false, cellText: false, sheetRows: 5001 });
    const sheets = [];
    for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        if (!sheet['!ref']) continue;
        const range = XLSX.utils.decode_range(sheet['!ref']);
        const sample = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, range: { s: range.s, e: { r: Math.min(range.s.r + 19, range.e.r), c: Math.min(range.s.c + 49, range.e.c) } } });
        const headerIndex = sample.findIndex(row => row.some(cell => ['data', 'data da aula'].includes(headerKey(cell))));
        if (headerIndex === -1) continue;
        const headers = sample[headerIndex].map(headerKey);
        const dateColumn = headers.findIndex(cell => cell === 'data' || cell === 'data da aula');
        const attendanceColumn = headers.findIndex(cell => cell === 'presenca' || cell === 'frequencia');
        const issues = [];
        const entries = [];
        const originalRange = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref']);
        if (originalRange.e.r - range.s.r > 4999 || originalRange.e.r > range.e.r) {
            issues.push('A aba excede o limite de 5.000 linhas. Divida a agenda em arquivos menores.');
        } else {
            const start = range.s.r + headerIndex + 1;
            for (let row = start; row <= range.e.r; row++) {
                const cell = column => sheet[XLSX.utils.encode_cell({ r: row, c: range.s.c + column })]?.v;
                const rawDate = cell(dateColumn);
                const rawAttendance = attendanceColumn === -1 ? undefined : cell(attendanceColumn);
                if ((rawDate == null || rawDate === '') && (rawAttendance == null || rawAttendance === '')) continue;
                const date = agendaDate(rawDate, workbook.Workbook?.WBProps?.date1904);
                const attendance = agendaAttendance(rawAttendance);
                if (!date || attendance === null) issues.push('Linha ' + (row + 1) + (date ? ' com presença inválida.' : ' com data inválida.'));
                else entries.push({ date, attendance });
            }
        }
        sheets.push({ name, entries, issues });
    }
    return sheets;
}

function importTarget() {
    const school = state.schools.find(item => item.id === $('importSchool').value && !isReference(item));
    const group = schoolClasses(school).find(item => item.id === $('importClass').value);
    return { school, group };
}

function refreshImportTarget(preferredClass = '') {
    const { school } = importTarget();
    const groups = schoolClasses(school);
    const needsClass = Boolean(school && !isIndividual(school));
    $('importClassField').hidden = !needsClass;
    $('importClass').required = needsClass;
    $('importClass').disabled = !needsClass;
    $('importClass').innerHTML = groups.map(group => option(group.id, classLabel(group))).join('') || option('', 'Cadastre uma turma na escola');
    if (groups.some(group => group.id === preferredClass)) $('importClass').value = preferredClass;
    renderImportPreview();
}

function importPlan(sheet, school, group) {
    const classId = group?.id ?? '';
    const seen = new Set(state.lessons.filter(lesson => lesson.schoolId === school.id && lesson.classId === classId).map(lesson => lesson.date));
    const rows = [];
    let duplicates = 0;
    for (const row of sheet.entries) {
        if (seen.has(row.date)) { duplicates++; continue; }
        seen.add(row.date);
        rows.push(row);
    }
    return { rows, duplicates };
}

function renderImportPreview() {
    const sheet = importedSheets[Number($('importSheet').value)];
    const { school, group } = importTarget();
    const hasTarget = school && (isIndividual(school) || group);
    const preview = $('importPreview');
    $('confirmImport').disabled = true;
    if (readingImport) {
        preview.innerHTML = '<p>Validando planilha…</p>';
        return;
    }
    if (!sheet) {
        preview.textContent = hasTarget ? '' : 'Cadastre um aluno particular ou uma escola com turma para selecionar o destino.';
        return;
    }
    const plan = hasTarget ? importPlan(sheet, school, group) : null;
    const rows = plan?.rows ?? sheet.entries;
    const individual = isIndividual(school);
    const firstDate = rows.reduce((first, row) => !first || row.date < first ? row.date : first, '');
    const lastDate = rows.reduce((last, row) => row.date > last ? row.date : last, '');
    const ignored = [plan?.duplicates ? plan.duplicates + ' com data repetida ou já cadastrada' : '', sheet.issues.length ? sheet.issues.length + ' com erro' : ''].filter(Boolean);
    const attendanceIgnored = hasTarget && !individual && rows.some(row => row.attendance);
    preview.innerHTML = '<p><strong>' + rows.length + (hasTarget ? ' para importar' : ' datas válidas') + '</strong>' +
        (firstDate ? ' · ' + br(firstDate) + ' a ' + br(lastDate) : '') + (ignored.length ? ' · ' + ignored.join(' · ') : '') + '</p>' +
        (!hasTarget ? '<p>Selecione um aluno particular ou uma turma para importar. Cadastre o destino se ele ainda não aparecer na lista.</p>' : '') +
        (plan?.duplicates && !rows.length ? '<p>As datas válidas desta aba já estão no destino selecionado.</p>' : '') +
        (!sheet.entries.length && !sheet.issues.length ? '<p>Preencha a coluna Data e selecione a planilha novamente.</p>' : '') +
        (attendanceIgnored ? '<p>A presença da planilha será ignorada para a turma. Preencha a chamada por aluno no diário.</p>' : '') +
        (sheet.issues.length ? '<ul class="import-issues">' + sheet.issues.slice(0, 6).map(issue => '<li>' + issue + '</li>').join('') + '</ul>' : '') +
        (rows.length ? '<div class="table-wrap import-table"><table aria-label="Prévia da agenda"><thead><tr><th scope="col">Data</th><th scope="col">Frequência</th></tr></thead><tbody>' +
            rows.slice(0, 12).map(row => '<tr><td>' + br(row.date) + '</td><td>' + attendanceOptions[individual ? row.attendance : ''] + '</td></tr>').join('') +
            '</tbody></table></div>' + (rows.length > 12 ? '<small class="muted">Prévia das 12 primeiras datas.</small>' : '') : '');
    $('confirmImport').disabled = savingImport || !hasTarget || !rows.length;
}

function clearImportSheet() {
    readVersion++;
    readingImport = false;
    importedSheets = [];
    $('importSheet').replaceChildren();
    $('importSheetField').hidden = true;
    $('importError').textContent = '';
    $('agendaFile').removeAttribute('aria-invalid');
    renderImportPreview();
}

$('openImport').onclick = () => {
    importForm.reset();
    const selected = selectSchool();
    const destinations = state.schools.filter(school => !isReference(school));
    $('importSchool').innerHTML = destinations.map(school => option(school.id, school.name + ' · ' + (isIndividual(school) ? 'Aluno particular' : networks[school.network]))).join('') || option('', 'Nenhum destino cadastrado');
    if (selected && !isReference(selected)) $('importSchool').value = selected.id;
    clearImportSheet();
    refreshImportTarget(diaryClassId);
    $('importDialog').showModal();
};

$('agendaFile').onchange = validateImportFile;
$('importSchool').onchange = () => refreshImportTarget();
$('importClass').onchange = $('importSheet').onchange = renderImportPreview;

function showImportFileError(message) {
    $('importError').textContent = message;
    $('agendaFile').setAttribute('aria-invalid', 'true');
}

async function validateImportFile() {
    clearImportSheet();
    const currentRead = readVersion;
    const file = $('agendaFile').files[0];
    if (!file) return;
    let error;
    if (!/\.xlsx$/i.test(file.name)) error = 'Selecione um arquivo .xlsx.';
    else if (file.size > 10 * 1024 * 1024) error = 'Use uma planilha de até 10 MB.';
    else if (typeof XLSX === 'undefined') error = 'O leitor de Excel não foi carregado. Recarregue a página.';
    if (error) { showImportFileError(error); return; }
    readingImport = true;
    renderImportPreview();
    const isCurrent = () => currentRead === readVersion && $('importDialog').open;
    try {
        const buffer = await file.arrayBuffer();
        if (!isCurrent()) return;
        if (new DataView(buffer).getUint32(0, false) !== 0x504b0304) throw new Error('Formato inválido');
        importedSheets = parseAgenda(buffer);
        if (!importedSheets.length) showImportFileError('Nenhuma aba com a coluna Data foi encontrada. Confira o cabeçalho da planilha e tente novamente.');
        $('importSheet').innerHTML = importedSheets.map((sheet, index) => option(index, sheet.name)).join('');
        $('importSheet').selectedIndex = Math.max(0, importedSheets.findIndex(sheet => sheet.entries.length));
        $('importSheetField').hidden = !importedSheets.length;
    } catch {
        if (isCurrent()) showImportFileError('Não foi possível ler a planilha. Abra o arquivo no Excel, salve uma cópia como .xlsx e selecione a cópia.');
    } finally {
        if (isCurrent()) {
            readingImport = false;
            renderImportPreview();
        }
    }
}

importForm.onsubmit = async event => {
    event.preventDefault();
    if ($('confirmImport').disabled) return;
    const { school, group } = importTarget();
    const sheet = importedSheets[Number($('importSheet').value)];
    const { rows } = importPlan(sheet, school, group);
    const individual = isIndividual(school);
    const added = rows.map(row => {
        const participants = participantsFor(school, group);
        const marked = individual && Boolean(row.attendance);
        if (marked) participants[0].attendance = row.attendance;
        return {
            id: newId(), schoolId: school.id, classId: group?.id ?? '', date: row.date, start: '', end: '',
            status: marked ? 'held' : 'scheduled', content: '', notes: '', participants
        };
    });
    savingImport = true;
    $('confirmImport').disabled = true;
    $('confirmImport').textContent = 'Importando…';
    $('importError').textContent = '';
    const selected = { ...state.selected, [school.network]: school.id };
    const saved = await commit({ ...state, selected, lessons: [...state.lessons, ...added] });
    savingImport = false;
    $('confirmImport').textContent = 'Importar aulas';
    if (!saved) {
        renderImportPreview();
        return;
    }
    network = school.network;
    diaryClassId = group?.id ?? '';
    $('diaryMonth').value = '';
    showLessonPeriod(rows.find(row => row.date.startsWith(year + '-'))?.date ?? rows[0].date);
    $('importDialog').close();
    switchPage('diary');
    const years = [...new Set(rows.map(row => row.date.slice(0, 4)))].sort();
    toast((added.length === 1 ? '1 aula importada' : added.length + ' aulas importadas') + ' · ' + years.join(', ') + '.');
};
