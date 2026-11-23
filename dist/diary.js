'use strict';

const lessonStatuses = { scheduled: 'Agendada', held: 'Realizada', cancelled: 'Cancelada' };
const attendanceOptions = { '': 'Sem registro', present: 'Presença', absent: 'Falta', excused: 'Falta justificada' };
const schoolClasses = school => state.classes.filter(group => group.schoolId === school?.id);
const classLabel = group => [group.name, group.subject].filter(Boolean).join(' · ');
const monthOptions = monthNames.map((name, index) => option(index + 1, cap(name))).join('');
$('diaryMonth').insertAdjacentHTML('beforeend', monthOptions);

let diaryClassId = '';
let classInForm = null;
let lessonInForm = null;
let roster = [];
let pendingLessonDate = '';

function summarizeAttendance(lessons) {
    const result = { present: 0, absent: 0, excused: 0 };
    for (const lesson of lessons) {
        if (lesson.status !== 'held') continue;
        for (const member of lesson.participants) {
            if (member.attendance) result[member.attendance]++;
        }
    }
    return result;
}

function attendanceSummary({ present, absent, excused }) {
    const labels = [];
    if (present) labels.push(present + (present === 1 ? ' presença' : ' presenças'));
    if (absent) labels.push(absent + (absent === 1 ? ' falta' : ' faltas'));
    if (excused) labels.push(excused + (excused === 1 ? ' falta justificada' : ' faltas justificadas'));
    return labels.join(' · ') || '—';
}

function renderDiary(school = selectSchool()) {
    const groups = schoolClasses(school);
    if (!groups.some(group => group.id === diaryClassId)) diaryClassId = '';
    const schoolDiary = school && !isReference(school);
    const hasClasses = schoolDiary && !isIndividual(school);
    $('newClass').hidden = !hasClasses;
    $('newLesson').hidden = !schoolDiary;
    $('newLesson').disabled = Boolean(hasClasses && !groups.length);
    $('diaryFilters').hidden = !schoolDiary;
    $('diaryClass').closest('.class-filter').hidden = !hasClasses;
    $('diaryClass').innerHTML = option('', 'Todas as turmas') + groups.map(group => option(group.id, classLabel(group))).join('');
    $('diaryClass').value = diaryClassId;
    $('editClass').disabled = !diaryClassId;
    const selectedMonth = Number($('diaryMonth').value);
    const lessons = schoolDiary ? state.lessons.filter(lesson => lesson.schoolId === school.id && lesson.date.startsWith(year + '-') &&
        (!diaryClassId || diaryClassId === lesson.classId) && (!selectedMonth || Number(lesson.date.slice(5, 7)) === selectedMonth)) : [];
    lessons.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
    const classesById = new Map(groups.map(group => [group.id, group]));
    $('diaryStats').innerHTML = schoolDiary ? Object.entries(lessonStatuses).map(([status, label]) => {
        const total = lessons.filter(lesson => lesson.status === status).length;
        return '<div><strong>' + total + '</strong> ' + label.toLowerCase() + (total === 1 ? '' : 's') + '</div>';
    }).join('') : '';
    if (!lessons.length) {
        let message = 'Nenhuma aula nos filtros selecionados.';
        if (!school) message = 'Cadastre um aluno particular para criar o diário.';
        else if (isReference(school)) message = 'Cadastre a escola para criar turmas e registrar aulas. O calendário de referência está na aba Calendário.';
        else if (hasClasses && !groups.length) message = 'Crie uma turma para agendar aulas e registrar a chamada.';
        $('diaryContent').innerHTML = '<p class="empty">' + message + '</p>';
        return;
    }
    $('diaryContent').innerHTML = '<div class="table-wrap"><table aria-label="Aulas do diário"><thead><tr><th scope="col">Data</th><th scope="col">' +
        (hasClasses ? 'Turma e conteúdo' : 'Conteúdo') + '</th><th scope="col">Situação</th><th scope="col">Chamada</th><th scope="col">Registro</th></tr></thead><tbody>' + lessons.map(lesson => {
            const group = classesById.get(lesson.classId);
            const title = group ? classLabel(group) : lesson.content || 'Aula particular';
            const detail = group && lesson.content ? '<small>' + escape(lesson.content) + '</small>' : '';
            const time = lesson.start ? lesson.start + (lesson.end ? '–' + lesson.end : '') : '';
            return '<tr><td><strong>' + br(lesson.date) + '</strong>' + (time ? '<small>' + time + '</small>' : '') +
                '</td><td class="lesson-content">' + escape(title) + detail + '</td><td>' + pill(lesson.status, lessonStatuses[lesson.status]) +
                '</td><td>' + attendanceSummary(summarizeAttendance([lesson])) + '</td><td><button class="plain table-action" data-lesson="' +
                escape(lesson.id) + '" aria-label="Editar aula de ' + br(lesson.date) + '">Editar</button></td></tr>';
        }).join('') + '</tbody></table></div>';
}

$('diaryClass').onchange = event => { diaryClassId = event.target.value; renderDiary(); };
$('diaryMonth').onchange = () => renderDiary();
$('newClass').onclick = () => openClass();
$('editClass').onclick = () => openClass(state.classes.find(group => group.id === diaryClassId));
$('newLesson').onclick = () => openLesson();
$('diaryContent').onclick = event => {
    const button = event.target.closest('[data-lesson]');
    if (button) openLesson(state.lessons.find(lesson => lesson.id === button.dataset.lesson));
};

function addClassMember(member = { id: newId(), name: '' }) {
    const row = document.createElement('div');
    row.className = 'roster-row';
    row.dataset.member = member.id;
    row.innerHTML = '<input aria-label="Nome do aluno" maxlength="80" placeholder="Nome do aluno" required value="' + escape(member.name) +
        '"><button type="button" class="plain" aria-label="Remover aluno da turma">Remover</button>';
    $('classRoster').append(row);
    row.querySelector('button').onclick = () => row.remove();
    return row;
}

function openClass(group, nextDate = '') {
    const school = selectSchool();
    if (!school || isReference(school) || isIndividual(school)) return;
    classInForm = group ?? null;
    pendingLessonDate = nextDate;
    const form = $('classForm');
    form.reset();
    form.elements.name.value = group?.name ?? '';
    form.elements.subject.value = group?.subject ?? '';
    $('classTitle').textContent = group ? 'Editar turma' : 'Nova turma';
    $('classError').textContent = '';
    $('classRoster').replaceChildren();
    group?.students.forEach(addClassMember);
    $('classDialog').showModal();
}

$('addMember').onclick = () => addClassMember().querySelector('input').focus();
$('classForm').onsubmit = async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const school = selectSchool();
    const name = data.get('name').trim();
    const subject = data.get('subject').trim();
    const students = Array.from($('classRoster').children, row => ({ id: row.dataset.member, name: row.querySelector('input').value.trim() }));
    if (!name || students.some(member => !member.name)) {
        $('classError').textContent = 'Preencha o nome da turma e dos alunos adicionados.';
        return;
    }
    const group = { id: classInForm?.id ?? newId(), schoolId: school.id, name, subject, students };
    if (schoolClasses(school).some(other => other.id !== group.id && classLabel(other).toLocaleLowerCase('pt-BR') === classLabel(group).toLocaleLowerCase('pt-BR'))) {
        $('classError').textContent = 'Já existe uma turma com esse nome e disciplina nesta escola.';
        return;
    }
    const classes = classInForm ? state.classes.map(other => other.id === group.id ? group : other) : [...state.classes, group];
    if (!await commit({ ...state, classes })) return;
    diaryClassId = group.id;
    $('classDialog').close();
    renderDiary();
    toast('Turma salva.');
    if (pendingLessonDate) openLesson(null, pendingLessonDate);
};

function participantsFor(school, group) {
    const students = isIndividual(school) ? [{ id: school.id, name: school.name }] : group?.students ?? [];
    return students.map(student => ({ ...student, attendance: '' }));
}

function lessonParticipants(lesson, school, group) {
    const saved = lesson?.participants ?? [];
    const savedCall = saved.some(member => member.attendance) || (lesson?.status === 'held' && saved.length);
    return savedCall ? saved : participantsFor(school, group);
}

function syncLessonAttendance() {
    const held = $('lessonForm').elements.status.value === 'held';
    $('lessonAttendance').disabled = !held;
    $('attendanceHint').hidden = held;
}

function showLessonRoster(participants) {
    roster = participants;
    const options = Object.entries(attendanceOptions).map(([value, label]) => option(value, label)).join('');
    $('lessonRoster').innerHTML = roster.map(({ name }) => '<label class="roster-row"><span>' + escape(name) + '</span><select>' + options + '</select></label>').join('') ||
        '<p class="muted">Cadastre alunos na turma para preencher a chamada.</p>';
    $('lessonRoster').querySelectorAll('select').forEach((field, index) => { field.value = roster[index].attendance; });
    syncLessonAttendance();
}

function followsLesson(other, lesson) {
    if (other.id === lesson.id || other.schoolId !== lesson.schoolId || other.classId !== lesson.classId) return false;
    return other.date > lesson.date || (other.date === lesson.date && Boolean(other.start && lesson.start && other.start > lesson.start));
}

function showLessonBulkEdit(lesson, school) {
    const checkbox = $('lessonForm').elements.applyToLater;
    $('lessonBulkEdit').hidden = !lesson;
    $('lessonBulkDetails').hidden = true;
    const count = lesson ? state.lessons.filter(other => followsLesson(other, lesson)).length : 0;
    checkbox.disabled = !count;
    const group = isIndividual(school) ? 'deste aluno' : 'desta turma';
    const affected = count === 1 ? '1 aula posterior' : count + ' aulas posteriores';
    $('lessonBulkScope').textContent = count
        ? 'Ao salvar, os campos alterados serão aplicados a ' + affected + ' ' + group + '.'
        : 'Cadastre aulas posteriores ' + group + ' para editar em conjunto.';
}

function openLesson(lesson, date) {
    const school = selectSchool();
    if (!school || isReference(school)) return;
    const groups = schoolClasses(school);
    const individual = isIndividual(school);
    if (!individual && !groups.length) { openClass(null, date); return; }
    lessonInForm = lesson ?? null;
    const form = $('lessonForm');
    form.reset();
    const fields = form.elements;
    $('lessonClassField').hidden = individual;
    fields.classId.disabled = individual || Boolean(lesson);
    fields.classId.innerHTML = groups.map(group => option(group.id, classLabel(group))).join('');
    fields.classId.value = lesson?.classId || diaryClassId || groups[0]?.id || '';
    const selectedMonth = $('diaryMonth').value;
    fields.date.value = lesson?.date ?? date ?? (selectedMonth ? iso(year, Number(selectedMonth) - 1, 1) : today.startsWith(year + '-') ? today : iso(year, 0, 1));
    fields.start.value = lesson?.start ?? '';
    fields.end.value = lesson?.end ?? '';
    fields.status.value = lesson?.status ?? 'scheduled';
    fields.content.value = lesson?.content ?? '';
    fields.notes.value = lesson?.notes ?? '';
    const group = groups.find(choice => choice.id === fields.classId.value);
    showLessonRoster(lessonParticipants(lesson, school, group));
    showLessonBulkEdit(lesson, school);
    $('lessonTitle').textContent = lesson ? 'Editar aula' : 'Nova aula';
    $('lessonError').textContent = '';
    $('removeLesson').hidden = !lesson;
    $('lessonDialog').showModal();
}

function openDiaryDate(date) {
    const school = selectSchool();
    const lessons = state.lessons.filter(lesson => lesson.schoolId === school.id && lesson.date === date);
    if (lessons.length <= 1) { openLesson(lessons[0], date); return; }
    diaryClassId = '';
    $('diaryMonth').value = Number(date.slice(5, 7));
    switchPage('diary');
    $('diaryContent').querySelector('[data-lesson="' + lessons[0].id + '"]')?.focus();
}

$('lessonForm').elements.status.onchange = syncLessonAttendance;
$('lessonForm').elements.applyToLater.onchange = event => { $('lessonBulkDetails').hidden = !event.target.checked; };
$('lessonForm').elements.classId.onchange = event => {
    const school = selectSchool();
    showLessonRoster(participantsFor(school, schoolClasses(school).find(group => group.id === event.target.value)));
};

function validLessonHours(start, end) {
    return !end || (start && end > start);
}

function prepareLessonBatch(original, edited, school, dateField) {
    const changedFields = ['start', 'end', 'status', 'content', 'notes'].filter(field => edited[field] !== original[field]);
    const changes = Object.fromEntries(changedFields.map(field => [field, edited[field]]));
    const dateShift = Date.parse(edited.date) - Date.parse(original.date);
    const changedMarks = new Map();
    if (edited.status === 'held') {
        edited.participants.forEach((member, index) => {
            if (member.attendance !== roster[index].attendance) changedMarks.set(member.id, member.attendance);
        });
    }
    const group = state.classes.find(group => group.id === original.classId);
    const updates = new Map();
    for (const other of state.lessons) {
        if (!followsLesson(other, original)) continue;
        const updated = { ...other, ...changes };
        if (dateShift) {
            updated.date = new Date(Date.parse(other.date) + dateShift).toISOString().slice(0, 10);
            if (updated.date < dateField.min || updated.date > dateField.max) {
                return { error: 'O deslocamento deixaria a aula de ' + br(other.date) + ' fora do intervalo de datas permitido.' };
            }
        }
        if ((updated.start !== other.start || updated.end !== other.end) && !validLessonHours(updated.start, updated.end)) {
            return { error: 'A aula de ' + br(other.date) + ' ficaria com um horário inválido. Revise o início e o fim das aulas.' };
        }
        let rosterChanged = false;
        if (updated.status === 'held' && (other.status !== 'held' || changedMarks.size)) {
            const members = lessonParticipants(other, school, group);
            const updatedMembers = members.map(member => {
                const mark = changedMarks.get(member.id);
                return mark === undefined || mark === member.attendance ? member : { ...member, attendance: mark };
            });
            rosterChanged = other.status !== 'held' || updatedMembers.some((member, index) => member !== members[index]);
            if (rosterChanged) updated.participants = updatedMembers;
        }
        if (dateShift || rosterChanged || changedFields.some(field => updated[field] !== other[field])) updates.set(other.id, updated);
    }
    return { updates };
}

$('lessonForm').onsubmit = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const { date, start, end, status, content, notes, classId, applyToLater } = form.elements;
    if (!validLessonHours(start.value, end.value)) {
        $('lessonError').textContent = 'Informe o início e um horário de término posterior.';
        return;
    }
    const school = selectSchool();
    const groupId = isIndividual(school) ? '' : classId.value;
    const attendance = $('lessonRoster').querySelectorAll('select');
    const participants = roster.map((member, index) => ({ ...member, attendance: attendance[index].value }));
    const lesson = {
        id: lessonInForm?.id ?? newId(), schoolId: school.id, classId: groupId, date: date.value,
        start: start.value, end: end.value, status: status.value, content: content.value.trim(), notes: notes.value.trim(), participants
    };
    let followingUpdates = new Map();
    if (lessonInForm && applyToLater.checked) {
        const batch = prepareLessonBatch(lessonInForm, lesson, school, date);
        if (batch.error) {
            $('lessonError').textContent = batch.error;
            return;
        }
        followingUpdates = batch.updates;
    }
    const lessons = lessonInForm
        ? state.lessons.map(other => other.id === lesson.id ? lesson : followingUpdates.get(other.id) ?? other)
        : [...state.lessons, lesson];
    const button = form.querySelector('[type=submit]');
    button.disabled = true;
    const saved = await commit({ ...state, lessons });
    button.disabled = false;
    if (!saved) return;
    $('lessonDialog').close();
    showLessonPeriod(lesson.date);
    diaryClassId = groupId;
    render();
    toast(followingUpdates.size ? (followingUpdates.size + 1) + ' aulas atualizadas.' : 'Aula salva.');
};

$('removeLesson').onclick = async () => {
    if (!lessonInForm || !confirm('Excluir esta aula e sua chamada?')) return;
    const lessons = state.lessons.filter(lesson => lesson.id !== lessonInForm.id);
    if (!await commit({ ...state, lessons })) return;
    $('lessonDialog').close();
    render();
    toast('Aula excluída.');
};

function showLessonPeriod(date) {
    const lessonYear = Number(date.slice(0, 4));
    if (lessonYear !== year) {
        year = lessonYear;
        syncDateInputs();
        clearRule();
    }
    month = Number(date.slice(5, 7)) - 1;
    if ($('diaryMonth').value) $('diaryMonth').value = String(month + 1);
}
