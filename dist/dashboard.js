'use strict';

const dashboardFilters = $('dashboardFilters');
const dashboardPercent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const dashboardCollator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
const dashboardSortButtons = $('dashboardTable').querySelectorAll('[data-sort]');
let dashboardSortColumn = 'date';
let dashboardSortAscending = false;
$('dashboardWeekday').insertAdjacentHTML('beforeend', weekOrder.map(day => option(day, cap(weekdays[day]))).join(''));

function renderDashboard() {
    const fields = dashboardFilters.elements;
    const from = fields.from.value;
    const to = fields.to.value;
    const reversedDates = Boolean(from && to && from > to);
    const invalidDate = !fields.from.validity.valid || !fields.to.validity.valid;
    let dateError = '';
    if (invalidDate) dateError = 'Informe datas válidas entre 1900 e 2199.';
    else if (reversedDates) dateError = 'A data final deve ser igual ou posterior à inicial.';
    $('dashboardDateError').textContent = dateError;
    fields.from.setAttribute('aria-invalid', !fields.from.validity.valid);
    fields.to.setAttribute('aria-invalid', !fields.to.validity.valid || reversedDates);
    $('dashboardResults').hidden = Boolean(dateError);
    if (dateError) return;

    const schools = new Map(state.schools.map(school => [school.id, school]));
    const groups = new Map(state.classes.map(group => [group.id, group]));
    const lessons = state.lessons.map(lesson => {
        const school = schools.get(lesson.schoolId);
        const group = groups.get(lesson.classId);
        return { lesson, school, group, participants: lessonParticipants(lesson, school, group) };
    });
    updateDashboardStudents(lessons, schools);

    const studentId = fields.student.value;
    const attendance = fields.attendance.value;
    const weekday = fields.weekday.value;
    const rows = [];
    for (const { lesson, school, group, participants } of lessons) {
        if ((from && lesson.date < from) || (to && lesson.date > to)) continue;
        if (weekday !== '' && weekdayOf(lesson.date) !== Number(weekday)) continue;
        const members = studentId ? participants.filter(member => member.id === studentId) : participants;
        if (studentId && !members.length) continue;
        const marks = lesson.status === 'held' && members.length ? members.map(member => member.attendance || 'unrecorded') : ['unrecorded'];
        if (attendance && !marks.includes(attendance)) continue;
        rows.push({
            lesson,
            target: (group ? classLabel(group) : school?.name) || 'Vínculo sem nome',
            context: group ? school?.name : isIndividual(school) ? 'Aluno particular' : '',
            content: lesson.content || '',
            status: lessonStatuses[lesson.status],
            attendance: dashboardAttendance(lesson, marks)
        });
    }
    rows.sort(compareDashboardRows);
    renderDashboardReport(rows);
    $('dashboardTable').hidden = !rows.length;
    $('dashboardEmpty').hidden = Boolean(rows.length);
    $('dashboardEmpty').textContent = state.lessons.length ? 'Nenhuma aula corresponde aos filtros.' : 'As aulas lançadas no diário e as importadas do Excel aparecem aqui.';
    $('dashboardRows').innerHTML = rows.map(dashboardRow).join('');
}

function compareDashboardRows(a, b) {
    const dateOrder = a.lesson.date.localeCompare(b.lesson.date);
    const timeOrder = a.lesson.start.localeCompare(b.lesson.start);
    const direction = dashboardSortAscending ? 1 : -1;
    if (dashboardSortColumn === 'date') return dateOrder * direction || timeOrder;

    const left = a[dashboardSortColumn];
    const right = b[dashboardSortColumn];
    if (Boolean(left) !== Boolean(right)) return left ? -1 : 1;
    return dashboardCollator.compare(left, right) * direction || -dateOrder || timeOrder;
}

function updateDashboardSortHeaders() {
    for (const button of dashboardSortButtons) {
        const header = button.closest('th');
        const active = button.dataset.sort === dashboardSortColumn;
        const nextAscending = !active || !dashboardSortAscending;
        const order = button.dataset.sort === 'date' ? (nextAscending ? 'crescente' : 'decrescente') : (nextAscending ? 'de A a Z' : 'de Z a A');
        button.title = 'Ordenar ' + order;
        button.querySelector('span').textContent = active ? (dashboardSortAscending ? '↑' : '↓') : '↕';
        if (active) header.setAttribute('aria-sort', dashboardSortAscending ? 'ascending' : 'descending');
        else header.removeAttribute('aria-sort');
    }
}

for (const button of dashboardSortButtons) {
    button.onclick = () => {
        dashboardSortAscending = button.dataset.sort !== dashboardSortColumn || !dashboardSortAscending;
        dashboardSortColumn = button.dataset.sort;
        updateDashboardSortHeaders();
        renderDashboard();
    };
}
updateDashboardSortHeaders();

function updateDashboardStudents(lessons, schools) {
    const students = new Map();
    const addStudent = (student, group, school) => {
        const label = group ? [student.name, school?.name, classLabel(group)].filter(Boolean).join(' · ') : student.name;
        students.set(student.id, label);
    };
    for (const { participants, group, school } of lessons) {
        for (const student of participants) addStudent(student, group, school);
    }
    for (const group of state.classes) {
        for (const student of group.students) addStudent(student, group, schools.get(group.schoolId));
    }
    for (const school of schools.values()) {
        if (isIndividual(school)) addStudent(school);
    }
    const select = $('dashboardStudent');
    const selected = select.value;
    const options = [...students].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
    select.innerHTML = option('', 'Todos os alunos') + options.map(([id, label]) => option(id, label)).join('');
    select.value = students.has(selected) ? selected : '';
}

function renderDashboardReport(rows) {
    const total = rows.length;
    const held = rows.filter(({ lesson }) => lesson.status === 'held').length;
    const rate = total ? held / total : 0;
    $('dashboardHeld').textContent = held;
    $('dashboardTotal').textContent = total;
    $('dashboardRate').textContent = total ? dashboardPercent.format(rate) : '—';
    $('dashboardProgress').value = rate * 100;
}

function dashboardAttendance(lesson, marks) {
    let attendance = attendanceOptions[marks[0] ?? ''] ?? attendanceOptions[''];
    if (marks.length > 1 && marks.some(mark => mark !== 'unrecorded')) {
        attendance = attendanceSummary(summarizeAttendance([lesson]));
        const unrecorded = marks.filter(mark => mark === 'unrecorded').length;
        if (unrecorded) attendance += ' · ' + unrecorded + ' sem registro';
    }
    return attendance;
}

function dashboardRow({ lesson, target, context, content, status, attendance }) {
    const time = lesson.start ? lesson.start + (lesson.end ? '–' + lesson.end : '') : '';
    return '<tr><td><strong>' + br(lesson.date) + '</strong><small>' + cap(weekdays[weekdayOf(lesson.date)]) + (time ? ' · ' + time : '') + '</small></td>' +
        '<td><strong>' + escape(target) + '</strong>' + (context ? '<small>' + escape(context) + '</small>' : '') + '</td>' +
        '<td class="lesson-content">' + escape(content || '—') + '</td><td>' + pill(lesson.status, status) + '</td><td>' + attendance + '</td></tr>';
}

dashboardFilters.addEventListener('submit', event => event.preventDefault());
dashboardFilters.addEventListener('change', renderDashboard);
$('clearDashboardFilters').onclick = () => {
    dashboardFilters.reset();
    renderDashboard();
};
