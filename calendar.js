(function () {
  'use strict';

  // ── Elements ──────────────────────────────────────────────────
  var calGrid      = document.getElementById('calGrid');
  var calTitle     = document.getElementById('calTitle');
  var calPrev      = document.getElementById('calPrev');
  var calNext      = document.getElementById('calNext');
  var calToday     = document.getElementById('calToday');
  var calDetail    = document.getElementById('calDetail');
  var calDetailDate = document.getElementById('calDetailDate');
  var calDetailTasks = document.getElementById('calDetailTasks');
  var calDetailClose = document.getElementById('calDetailClose');
  var themeToggle  = document.getElementById('themeToggle');

  // ── State ──────────────────────────────────────────────────────
  var tasks = [];
  var currentYear;
  var currentMonth;
  var selectedDate = null;

  // ── Storage ────────────────────────────────────────────────────
  function loadTasks() {
    try {
      var raw = localStorage.getItem('todoTasks');
      tasks = raw ? JSON.parse(raw) : [];
    } catch (e) { tasks = []; }
  }

  function saveTasks() {
    localStorage.setItem('todoTasks', JSON.stringify(tasks));
  }

  function getToday() {
    var d = new Date();
    var mm = (d.getMonth() + 1).toString().padStart(2, '0');
    var dd = d.getDate().toString().padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  // ── Theme ──────────────────────────────────────────────────────
  function loadTheme() {
    var theme = localStorage.getItem('todoTheme');
    if (theme === 'dark') {
      document.body.classList.add('dark');
      themeToggle.textContent = '🌙';
    } else {
      document.body.classList.remove('dark');
      themeToggle.textContent = '☀️';
    }
  }

  function saveTheme() {
    localStorage.setItem('todoTheme', document.body.classList.contains('dark') ? 'dark' : 'light');
  }

  themeToggle.addEventListener('click', function () {
    document.body.classList.toggle('dark');
    themeToggle.textContent = document.body.classList.contains('dark') ? '🌙' : '☀️';
    saveTheme();
  });

  // ── Background ─────────────────────────────────────────────────
  function loadBg() {
    var bgIndex = parseInt(localStorage.getItem('todoBg'), 10) || 0;
    var images = ['bg/indax.jpg', 'bg/indax2.jpg', 'bg/indax3.jpg', 'bg/indax4.jpg', 'bg/indax5.jpg', 'bg/indax6.jpg'];
    if (bgIndex >= 0 && bgIndex < images.length) {
      document.body.style.backgroundImage = 'url(\'' + images[bgIndex] + '\')';
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    }
  }

  // ── Date Helpers ───────────────────────────────────────────────
  function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function firstDayOfWeek(year, month) {
    var dow = new Date(year, month, 1).getDay();
    return dow === 0 ? 6 : dow - 1; // Mon=0, Tue=1, ..., Sun=6
  }

  function getDateStr(year, month, day) {
    var mm = (month + 1).toString().padStart(2, '0');
    var dd = day.toString().padStart(2, '0');
    return year + '-' + mm + '-' + dd;
  }

  function formatDateCN(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    return parseInt(parts[1], 10) + '月' + parseInt(parts[2], 10) + '日';
  }

  function formatDuration(minutes) {
    if (!minutes && minutes !== 0) return '';
    var m = parseInt(minutes, 10);
    if (!m) return '';
    if (m < 60) return m + '分钟';
    var h = Math.floor(m / 60);
    var rest = m % 60;
    if (rest === 0) return h + '小时';
    return h + '小时 ' + rest + '分钟';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Task Queries ───────────────────────────────────────────────
  function getTasksForDate(dateStr) {
    return tasks.filter(function (t) { return t.dueDate === dateStr && !t.completed; });
  }

  function toggleTask(id) {
    var task = tasks.find(function (t) { return t.id === id; });
    if (task) {
      task.completed = !task.completed;
      saveTasks();
      renderCalendar();
      if (selectedDate) showDetail(selectedDate);
    }
  }

  // ── Detail Panel ───────────────────────────────────────────────
  function showDetail(dateStr) {
    selectedDate = dateStr;
    calDetail.classList.remove('hidden');
    calDetailDate.textContent = '📅 ' + formatDateCN(dateStr);

    var dateTasks = tasks.filter(function (t) { return t.dueDate === dateStr; });
    if (dateTasks.length === 0) {
      calDetailTasks.innerHTML = '<div class="cal-detail-empty">暂无任务</div>';
      return;
    }

    var priorityLabels = { high: '🔴 高', medium: '🟡 中', low: '🟢 低' };
    var categoryLabels = { work: '💼 工作', study: '📚 学习', life: '🏠 生活', other: '📌 其他' };

    var html = '';
    dateTasks.forEach(function (t) {
      var priorityClass = 'priority-' + t.priority;
      html +=
        '<div class="cal-task-row' + (t.completed ? ' completed' : '') + '">' +
          '<button class="cal-task-checkbox" data-toggle="' + t.id + '">✓</button>' +
          '<span class="cal-task-title">' + (t.trackingId ? '🔍 ' : '') + escapeHtml(t.title) + '</span>' +
          '<div class="cal-task-meta">' +
            '<span class="cal-tag ' + priorityClass + '">' + (priorityLabels[t.priority] || '') + '</span>' +
            (t.category ? '<span class="cal-tag category">' + (categoryLabels[t.category] || t.category) + '</span>' : '') +
            (t.estimatedMinutes ? '<span class="cal-tag duration">⏱ ' + formatDuration(t.estimatedMinutes) + '</span>' : '') +
            (t.trackingId ? '<span class="cal-tag tracking">追踪中</span>' : '') +
          '</div>' +
        '</div>';
    });
    calDetailTasks.innerHTML = html;

    calDetailTasks.querySelectorAll('[data-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleTask(this.dataset.toggle);
      });
    });
  }

  calDetailClose.addEventListener('click', function () {
    calDetail.classList.add('hidden');
    selectedDate = null;
    renderCalendar();
  });

  // ── Calendar Render ────────────────────────────────────────────
  function renderCalendar() {
    calGrid.innerHTML = '';
    calTitle.textContent = currentYear + '年 ' + (currentMonth + 1) + '月';

    var today = getToday();
    var days = daysInMonth(currentYear, currentMonth);
    var startDow = firstDayOfWeek(currentYear, currentMonth);

    var prevMonthDays = daysInMonth(currentYear, currentMonth - 1);
    var prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    var prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    var nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    var nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    var totalCells = 42; // 6 rows × 7 cols
    for (var i = 0; i < totalCells; i++) {
      var dayNum, dateStr, isOutOfMonth = false;

      if (i < startDow) {
        // Previous month
        dayNum = prevMonthDays - startDow + 1 + i;
        dateStr = getDateStr(prevYear, prevMonth, dayNum);
        isOutOfMonth = true;
      } else if (i - startDow >= days) {
        // Next month
        dayNum = i - startDow - days + 1;
        dateStr = getDateStr(nextYear, nextMonth, dayNum);
        isOutOfMonth = true;
      } else {
        dayNum = i - startDow + 1;
        dateStr = getDateStr(currentYear, currentMonth, dayNum);
      }

      var dayTasks = tasks.filter(function (t) { return t.dueDate === dateStr; });
      var activeTasks = dayTasks.filter(function (t) { return !t.completed; });

      var cell = document.createElement('div');
      cell.className = 'cal-day';
      if (isOutOfMonth) cell.classList.add('out-of-month');
      if (dateStr === today) cell.classList.add('today');
      if (dateStr === selectedDate) cell.classList.add('selected');

      var inner = '<div class="cal-day-num">' + dayNum + '</div>';

      var maxShow = 3;
      for (var j = 0; j < Math.min(activeTasks.length, maxShow); j++) {
        var t = activeTasks[j];
        inner +=
          '<div class="cal-task">' +
            '<span class="dot dot-' + t.priority + '"></span>' +
            '<span class="task-label">' + escapeHtml(t.title) + '</span>' +
          '</div>';
      }

      var remaining = activeTasks.length - maxShow;
      if (remaining > 0) {
        inner += '<div class="cal-day-more">+' + remaining + ' 更多</div>';
      }

      var completedCount = dayTasks.filter(function (t) { return t.completed; }).length;
      if (activeTasks.length === 0 && completedCount > 0) {
        inner += '<div class="cal-day-more" style="opacity:.5">✓ ' + completedCount + ' 已完成</div>';
      }

      cell.innerHTML = inner;
      cell.dataset.date = dateStr;
      cell.addEventListener('click', function () {
        var date = this.dataset.date;
        if (date === selectedDate) {
          calDetail.classList.add('hidden');
          selectedDate = null;
        } else {
          showDetail(date);
        }
        renderCalendar();
      });

      calGrid.appendChild(cell);
    }
  }

  // ── Navigation ─────────────────────────────────────────────────
  function navigateMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    calDetail.classList.add('hidden');
    selectedDate = null;
    renderCalendar();
  }

  calPrev.addEventListener('click', function () { navigateMonth(-1); });
  calNext.addEventListener('click', function () { navigateMonth(1); });
  calToday.addEventListener('click', function () {
    var today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    calDetail.classList.add('hidden');
    selectedDate = null;
    renderCalendar();
  });

  // ── Keyboard ───────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' && !e.ctrlKey) { navigateMonth(-1); }
    if (e.key === 'ArrowRight' && !e.ctrlKey) { navigateMonth(1); }
    if (e.key === 'Escape') { calDetail.classList.add('hidden'); selectedDate = null; renderCalendar(); }
  });

  // ── Init ───────────────────────────────────────────────────────
  var todayDate = new Date();
  currentYear = todayDate.getFullYear();
  currentMonth = todayDate.getMonth();

  loadTasks();
  loadTheme();
  loadBg();
  renderCalendar();
})();
