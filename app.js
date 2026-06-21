(function () {
  'use strict';

  // ── DOM refs ────────────────────────────────────────────────
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return document.querySelectorAll(sel); };

  var addForm         = $('#addForm');
  var titleInput      = $('#titleInput');
  var prioritySelect  = $('#prioritySelect');
  var dueDateInput    = $('#dueDateInput');
  var categorySelect  = $('#categorySelect');
  var durationInput   = $('#durationInput');
  var descInput       = $('#descInput');
  var toggleExtraBtn  = $('#toggleExtraBtn');
  var extraPanel      = $('.add-form-extra');

  var searchInput     = $('#searchInput');
  var taskList        = $('#taskList');
  var emptyState      = $('#emptyState');
  var emptyStateMsg   = emptyState.querySelector('p');
  var statTotal       = $('#statTotal');
  var statActive      = $('#statActive');
  var statDone        = $('#statDone');
  var statTracking    = $('#statTracking');
  var sortSelect      = $('#sortSelect');
  var clearCompletedBtn = $('#clearCompletedBtn');
  var dateGroupToggle  = $('#dateGroupToggle');
  var compactDoneBtn   = $('#compactDoneBtn');
  var filterBtns      = $$('.filter-btn');
  var toast           = $('#toast');
  var confirmDialog   = $('#confirmDialog');
  var confirmMsg      = $('#confirmMsg');
  var confirmYes      = $('#confirmYes');
  var confirmNo       = $('#confirmNo');

  var themeToggle     = $('#themeToggle');
  var helpToggle      = $('#helpToggle');
  var helpOverlay     = $('#helpOverlay');
  var helpClose       = $('#helpClose');
  var exportBtn       = $('#exportBtn');
  var importBtn       = $('#importBtn');
  var importFile      = $('#importFile');

  var folderList      = $('#folderList');
  var folderBar       = $('.folder-bar');
  var addFolderBtn    = $('#addFolderBtn');
  var folderInputRow  = $('#folderInputRow');
  var folderNameInput = $('#folderNameInput');
  var folderConfirm   = $('#folderInputConfirm');
  var folderCancel    = $('#folderInputCancel');
  var folderSelect    = $('#folderSelect');
  var contextMenu     = $('#contextMenu');
  var moveFolderList   = $('#moveFolderList');

  var recurringCheck  = $('#recurringCheck');
  var recurringStart  = $('#recurringStart');
  var recurringEnd    = $('#recurringEnd');
  var recurringDates  = $('.recurring-dates');
  var recurringOptions = $('.recurring-options');
  var weekdayPicker   = $('.weekday-picker');
  var repeatTypeRadios = $$('input[name="repeatType"]');
  var weekdayChips     = $$('.weekday-chip input');
  var trackingCheck   = $('#trackingCheck');

  // ── State ────────────────────────────────────────────────────
  var tasks = [];
  var folders = [];
  var recurringTasks = [];
  var trackingRules = [];
  var activeFolder = '__all__';
  var currentFilter = 'all';
  var searchQuery = '';
  var extraVisible = false;
  var dateGrouping = false;
  var compactDone = false;
  var confirmResolve = null;
  var toastTimer = null;
  var folderEditId = null; // for rename: set to folder id when creating vs. editing

  // ── Storage ──────────────────────────────────────────────────
  function loadTasks() {
    try {
      var raw = localStorage.getItem('todoTasks');
      tasks = raw ? JSON.parse(raw) : [];
    } catch (e) {
      tasks = [];
    }
  }

  function saveTasks() {
    localStorage.setItem('todoTasks', JSON.stringify(tasks));
  }

  function loadFolders() {
    try {
      var raw = localStorage.getItem('todoFolders');
      folders = raw ? JSON.parse(raw) : [];
    } catch (e) {
      folders = [];
    }
  }

  function saveFolders() {
    localStorage.setItem('todoFolders', JSON.stringify(folders));
  }

  function loadRecurring() {
    try {
      var raw = localStorage.getItem('todoRecurring');
      recurringTasks = raw ? JSON.parse(raw) : [];
    } catch (e) {
      recurringTasks = [];
    }
  }

  function saveRecurring() {
    localStorage.setItem('todoRecurring', JSON.stringify(recurringTasks));
  }

  function loadTrackingRules() {
    try {
      var raw = localStorage.getItem('todoTracking');
      trackingRules = raw ? JSON.parse(raw) : [];
    } catch (e) {
      trackingRules = [];
    }
  }

  function saveTrackingRules() {
    localStorage.setItem('todoTracking', JSON.stringify(trackingRules));
  }

  function getToday() {
    var d = new Date();
    var mm = (d.getMonth() + 1).toString().padStart(2, '0');
    var dd = d.getDate().toString().padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  function getDailyMinutes(rule) {
    var total = rule.totalEstimatedMinutes || rule.estimatedMinutes || null;
    if (!total) return null;
    var start = new Date(rule.startDate + 'T00:00:00');
    var end = new Date(rule.endDate + 'T00:00:00');
    var totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (totalDays <= 0) return total;
    return Math.round(total / totalDays);
  }

  function generateDailyTasks() {
    var today = getToday();
    var newTasks = [];
    recurringTasks.forEach(function (rule) {
      if (!rule.active) return;
      if (today < rule.startDate || today > rule.endDate) return;
      if (rule.lastGenDate === today) return;
      var repeatType = rule.repeatType || 'daily';
      var todayDow = new Date().getDay();
      if (repeatType === 'weekday' && (todayDow === 0 || todayDow === 6)) return;
      if (repeatType === 'weekend' && todayDow !== 0 && todayDow !== 6) return;
      if (repeatType === 'weekly' && (!rule.weeklyDays || rule.weeklyDays.indexOf(todayDow) === -1)) return;
      var task = {
        id: generateId(),
        title: rule.title,
        priority: rule.priority || 'medium',
        dueDate: today,
        category: rule.category || '',
        desc: (rule.desc || '').trim(),
        folderId: rule.folderId || null,
        estimatedMinutes: getDailyMinutes(rule),
        completed: false,
        createdAt: Date.now(),
        recurringSourceId: rule.id
      };
      tasks.unshift(task);
      newTasks.push(rule.title);
      rule.lastGenDate = today;
    });
    var trackingPushed = [];
    trackingRules.forEach(function (rule) {
      if (!rule.active) return;
      var task = tasks.find(function (t) { return t.id === rule.currentTaskId; });
      if (task && task.completed) { rule.active = false; return; }
      if (task && task.dueDate === today) return;
      if (task) {
        tasks = tasks.filter(function (t) { return t.id !== rule.currentTaskId; });
      }
      var newTaskId = generateId();
      tasks.unshift({
        id: newTaskId,
        title: rule.title,
        priority: rule.priority || 'medium',
        dueDate: today,
        category: rule.category || '',
        desc: (rule.desc || '').trim(),
        folderId: rule.folderId || null,
        estimatedMinutes: rule.estimatedMinutes || null,
        completed: false,
        createdAt: Date.now(),
        trackingId: rule.id
      });
      rule.currentTaskId = newTaskId;
      newTasks.push(rule.title);
      trackingPushed.push(rule.title);
    });
    if (newTasks.length > 0) {
      saveTasks();
      saveRecurring();
      if (trackingPushed.length > 0) saveTrackingRules();
      showToast('已自动添加 ' + newTasks.length + ' 个今日任务');
    }
  }

  function saveSort() {
    localStorage.setItem('todoSort', sortSelect.value);
  }

  function loadSort() {
    var saved = localStorage.getItem('todoSort');
    if (saved) sortSelect.value = saved;
  }

  function saveDateGrouping() {
    localStorage.setItem('todoDateGrouping', dateGrouping ? '1' : '');
  }

  function loadDateGrouping() {
    dateGrouping = localStorage.getItem('todoDateGrouping') === '1';
    if (dateGroupToggle) {
      dateGroupToggle.classList.toggle('active', dateGrouping);
    }
  }

  function saveCompactDone() {
    localStorage.setItem('todoCompactDone', compactDone ? '1' : '');
  }

  function loadCompactDone() {
    compactDone = localStorage.getItem('todoCompactDone') === '1';
    if (compactDoneBtn) {
      compactDoneBtn.classList.toggle('active', compactDone);
    }
  }

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

  // ── Background Image ──────────────────────────────────────────
  var bgImages = [
    'bg/indax.jpg',
    'bg/indax2.jpg',
    'bg/indax3.jpg',
    'bg/indax4.jpg',
    'bg/indax5.jpg',
    'bg/indax6.jpg'
  ];
  var bgIndex = 0;

  function loadBg() {
    var saved = localStorage.getItem('todoBg');
    if (saved !== null) {
      bgIndex = parseInt(saved, 10);
      if (isNaN(bgIndex) || bgIndex < 0 || bgIndex >= bgImages.length) bgIndex = 0;
    } else {
      bgIndex = 0;
    }
    document.body.style.backgroundImage = 'url(\'' + bgImages[bgIndex] + '\')';
  }

  function saveBg() {
    localStorage.setItem('todoBg', bgIndex);
  }

  // ── Folder Management ──────────────────────────────────────
  function createFolder(name) {
    var folder = {
      id: generateId(),
      name: name.trim(),
      createdAt: Date.now()
    };
    folders.push(folder);
    saveFolders();
    return folder;
  }

  function renameFolder(id, newName) {
    var folder = folders.find(function (f) { return f.id === id; });
    if (folder) {
      folder.name = newName.trim();
      saveFolders();
    }
  }

  function deleteFolder(id) {
    folders = folders.filter(function (f) { return f.id !== id; });
    // Move tasks from this folder to uncategorized
    tasks.forEach(function (t) {
      if (t.folderId === id) t.folderId = null;
    });
    saveFolders();
    saveTasks();
    if (activeFolder === id) {
      activeFolder = '__all__';
      updateFolderTabs();
    }
  }

  function getFolderById(id) {
    return folders.find(function (f) { return f.id === id; });
  }

  function getFolderTaskCount(folderId) {
    if (folderId === '__all__') return tasks.length;
    if (folderId === '__none__') return tasks.filter(function (t) { return !t.folderId; }).length;
    return tasks.filter(function (t) { return t.folderId === folderId; }).length;
  }

  function renderFolderList() {
    folderList.innerHTML = '';
    folders.forEach(function (f) {
      var btn = document.createElement('button');
      btn.className = 'folder-tab';
      btn.dataset.folder = f.id;
      btn.innerHTML = '📁 ' + escapeHtml(f.name) + '<span class="folder-count">' + getFolderTaskCount(f.id) + '</span>';
      if (f.id === activeFolder) btn.classList.add('active');
      folderList.appendChild(btn);
    });
    updateFolderTabs();
  }

  function updateFolderTabs() {
    var allTabs = document.querySelectorAll('.folder-tab');
    allTabs.forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.folder === activeFolder);
    });
  }

  function updateFolderSelect() {
    var current = folderSelect.value;
    folderSelect.innerHTML = '<option value="">📁 文件夹</option>';
    folders.forEach(function (f) {
      var opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = '📁 ' + f.name;
      if (f.id === current) opt.selected = true;
      folderSelect.appendChild(opt);
    });
  }

  function showFolderInput(existingId) {
    folderEditId = existingId || null;
    folderInputRow.hidden = false;
    folderNameInput.value = '';
    if (existingId) {
      var f = getFolderById(existingId);
      if (f) folderNameInput.value = f.name;
    }
    folderNameInput.focus();
  }

  function hideFolderInput() {
    folderInputRow.hidden = true;
    folderNameInput.value = '';
    folderEditId = null;
  }

  function commitFolderInput() {
    var name = folderNameInput.value.trim();
    if (!name) {
      showToast('请输入文件夹名称');
      return;
    }
    if (folderEditId) {
      renameFolder(folderEditId, name);
      showToast('文件夹已重命名');
    } else {
      createFolder(name);
      showToast('文件夹已创建');
    }
    hideFolderInput();
    renderFolderList();
    updateFolderSelect();
  }

  function hideContextMenu() {
    contextMenu.hidden = true;
  }

  function showFolderContextMenu(x, y, folderId) {
    hideContextMenu();
    contextMenu.querySelector('[data-section="folder"]').classList.add('show');
    contextMenu.querySelector('[data-section="task"]').classList.remove('show');
    contextMenu.dataset.context = 'folder';
    contextMenu.dataset.folderId = folderId;
    var folder = getFolderById(folderId);
    var renameBtn = contextMenu.querySelector('[data-action="rename-folder"]');
    if (folder) {
      renameBtn.textContent = '✏️ 重命名 "' + folder.name + '"';
    }
    contextMenu.hidden = false;
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
  }

  function showTaskContextMenu(x, y, taskId) {
    hideContextMenu();
    contextMenu.querySelector('[data-section="folder"]').classList.remove('show');
    contextMenu.querySelector('[data-section="task"]').classList.add('show');
    contextMenu.dataset.context = 'task';
    contextMenu.dataset.taskId = taskId;

    moveFolderList.innerHTML = '';
    var task = tasks.find(function (t) { return t.id === taskId; });

    var noneBtn = document.createElement('button');
    noneBtn.textContent = '📁 未分类';
    noneBtn.dataset.targetFolder = '';
    if (!task || !task.folderId) noneBtn.classList.add('active-move');
    noneBtn.addEventListener('click', function () {
      moveTaskToFolder(taskId, null);
      hideContextMenu();
    });
    moveFolderList.appendChild(noneBtn);

    folders.forEach(function (f) {
      var btn = document.createElement('button');
      btn.textContent = '📁 ' + escapeHtml(String(f.name).substring(0, 18));
      btn.dataset.targetFolder = f.id;
      if (task && task.folderId === f.id) btn.classList.add('active-move');
      btn.addEventListener('click', function () {
        moveTaskToFolder(taskId, f.id);
        hideContextMenu();
      });
      moveFolderList.appendChild(btn);
    });

    var subList = contextMenu.querySelector('#moveAsSubtaskList');
    subList.innerHTML = '';
    var srcTask = tasks.find(function (t) { return t.id === taskId; });
    if (srcTask) {
      var eligible = tasks.filter(function (t) {
        return t.id !== taskId && !t.completed;
      });
      if (eligible.length === 0) {
        var emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = 'padding:6px 14px;font-size:.8rem;color:var(--text-muted);';
        emptyMsg.textContent = '无可用任务';
        subList.appendChild(emptyMsg);
      } else {
        var groups = {};
        groupOrder.forEach(function (k) { groups[k] = []; });
        eligible.forEach(function (t) {
          var g = getDateGroup(t);
          if (groups[g]) groups[g].push(t);
        });
        groupOrder.forEach(function (key) {
          var items = groups[key];
          if (items.length === 0) return;
          var header = document.createElement('div');
          header.style.cssText = 'padding:6px 14px 3px;font-size:.73rem;color:var(--text-muted);font-weight:600;letter-spacing:.03em;';
          header.textContent = groupLabels[key].icon + ' ' + groupLabels[key].label + '（' + items.length + '）';
          subList.appendChild(header);
          items.forEach(function (t) {
            var btn = document.createElement('button');
            var label = t.title;
            if (label.length > 20) label = label.substring(0, 18) + '..';
            btn.textContent = '📋 ' + escapeHtml(label);
            btn.dataset.targetTaskId = t.id;
            btn.addEventListener('click', function () {
              var src = tasks.find(function (x) { return x.id === taskId; });
              if (!src) { hideContextMenu(); return; }
              var target = tasks.find(function (x) { return x.id === t.id; });
              if (!target) { hideContextMenu(); return; }
              if (!target.subtasks) target.subtasks = [];
              var newSub = {
                id: generateId(),
                title: src.title,
                estimatedMinutes: src.estimatedMinutes || null,
                completed: false,
                createdAt: Date.now()
              };
              if (target.estimatedMinutes) {
                var currentTotal = getSubtaskTotal(target);
                if (currentTotal + (newSub.estimatedMinutes || 0) > target.estimatedMinutes) {
                  showToast('子任务总时长将超过父任务总时长');
                  hideContextMenu();
                  return;
                }
              }
              target.subtasks.push(newSub);
              tasks = tasks.filter(function (x) { return x.id !== taskId; });
              saveTasks();
              hideContextMenu();
              render();
              renderFolderList();
              showToast('已转为子任务');
            });
            subList.appendChild(btn);
          });
        });
      }
    }

    contextMenu.hidden = false;
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
  }

  function moveTaskToFolder(taskId, folderId) {
    var task = tasks.find(function (t) { return t.id === taskId; });
    if (!task) return;
    task.folderId = folderId;
    saveTasks();
    renderFolderList();
    render();
    showToast('任务已移动');
  }

  // ── Helpers ──────────────────────────────────────────────────
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.add('show');
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 2000);
  }

  function confirm(msg) {
    return new Promise(function (resolve) {
      confirmMsg.textContent = msg;
      confirmDialog.hidden = false;
      confirmResolve = resolve;
    });
  }

  function closeConfirm() {
    confirmDialog.hidden = true;
    confirmResolve = null;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr + 'T00:00:00');
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var diff = target.getTime() - today.getTime();
    var days = diff / (1000 * 60 * 60 * 24);

    if (days === 0) return '今天';
    if (days === 1) return '明天';
    if (days === -1) return '昨天';
    if (days < -1) return '已过期';

    var mm = d.getMonth() + 1;
    var dd = d.getDate();
    return mm + '月' + dd + '日';
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr + 'T00:00:00');
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function getDateStatus(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr + 'T00:00:00');
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (target.getTime() < today.getTime()) return 'overdue';
    if (target.getTime() === today.getTime()) return 'today';
    return '';
  }

  function formatDuration(minutes) {
    if (!minutes && minutes !== 0) return '';
    var m = parseInt(minutes, 10);
    if (!m) return '';
    if (m < 60) return m + ' 分钟';
    var h = Math.floor(m / 60);
    var rest = m % 60;
    if (rest === 0) return h + ' 小时';
    return h + '小时 ' + rest + '分钟';
  }

  function priorityNum(p) {
    if (p === 'high') return 3;
    if (p === 'medium') return 2;
    return 1;
  }

  var categoryLabels = {
    work: '💼 工作',
    study: '📚 学习',
    life: '🏠 生活',
    other: '📌 其他'
  };

  function getDateGroup(task) {
    if (!task.dueDate) return 'none';
    var today = getToday();
    if (task.dueDate < today && !task.completed) return 'overdue';
    if (task.dueDate === today) return 'today';
    var tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    var tmrwStr = tmrw.getFullYear() + '-' +
      ((tmrw.getMonth() + 1).toString().padStart(2, '0')) + '-' +
      tmrw.getDate().toString().padStart(2, '0');
    if (task.dueDate === tmrwStr) return 'tomorrow';
    var taskDate = new Date(task.dueDate + 'T00:00:00');
    var todayD = new Date(today + 'T00:00:00');
    var diff = Math.round((taskDate - todayD) / (1000 * 60 * 60 * 24));
    if (diff >= 2 && diff <= 6) return 'thisweek';
    if (diff >= 7 && diff <= 13) return 'nextweek';
    return 'later';
  }

  var groupOrder = ['overdue', 'today', 'tomorrow', 'thisweek', 'nextweek', 'later', 'none'];
  var groupLabels = {
    overdue: { icon: '🔴', label: '已过期' },
    today: { icon: '📅', label: '今天' },
    tomorrow: { icon: '☀️', label: '明天' },
    thisweek: { icon: '📆', label: '本周' },
    nextweek: { icon: '📆', label: '下周' },
    later: { icon: '📅', label: '更远' },
    none: { icon: '📝', label: '无截止日期' }
  };
  var groupCss = {
    overdue: 'overdue',
    today: 'today',
    tomorrow: 'tomorrow',
    thisweek: 'thisweek',
    nextweek: 'nextweek',
    later: 'later',
    none: 'none'
  };

  // ── Filter / Sort / Search ───────────────────────────────────
  function getFilteredTasks() {
    var result = tasks.slice();

    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      result = result.filter(function (t) {
        return t.title.toLowerCase().indexOf(q) !== -1 ||
               (t.desc && t.desc.toLowerCase().indexOf(q) !== -1);
      });
    }

    if (activeFolder === '__none__') {
      result = result.filter(function (t) { return !t.folderId; });
    } else if (activeFolder !== '__all__') {
      result = result.filter(function (t) { return t.folderId === activeFolder; });
    }

    if (currentFilter === 'active') {
      result = result.filter(function (t) { return !t.completed; });
    } else if (currentFilter === 'completed') {
      result = result.filter(function (t) { return t.completed; });
    }

    var sortVal = sortSelect.value;
    if (sortVal !== 'manual') {
      result.sort(function (a, b) {
        var r;
        switch (sortVal) {
          case 'created-asc':
            r = a.createdAt - b.createdAt;
            break;
          case 'dueDate-asc':
            r = (a.dueDate || '9') > (b.dueDate || '9') ? 1 : -1;
            break;
          case 'dueDate-desc':
            r = (a.dueDate || '') < (b.dueDate || '') ? 1 : -1;
            break;
          case 'priority-desc':
            r = priorityNum(b.priority) - priorityNum(a.priority);
            break;
          case 'priority-asc':
            r = priorityNum(a.priority) - priorityNum(b.priority);
            break;
          case 'created-desc':
          default:
            r = b.createdAt - a.createdAt;
            break;
        }
        return r || b.createdAt - a.createdAt;
      });
    }

    return result;
  }

  function updateStats() {
    var total = tasks.length;
    var done = tasks.filter(function (t) { return t.completed; }).length;
    var tracking = tasks.filter(function (t) { return t.trackingId && !t.completed; }).length;
    statTotal.textContent = total;
    statActive.textContent = total - done;
    statDone.textContent = done;
    statTracking.textContent = tracking;
  }

  function renderTaskItem(task) {
    var div = document.createElement('div');
    div.className = 'task-item';
    if (task.completed) div.classList.add('completed');
    if (task.completed && compactDone) div.classList.add('compact');
    div.dataset.id = task.id;

    var dateText = formatDate(task.dueDate);
    var dateClass = getDateStatus(task.dueDate);
    var priorityLabel = { high: '🔴 高', medium: '🟡 中', low: '🟢 低' }[task.priority];
    var categoryLabel = categoryLabels[task.category] || '';
    var folder = getFolderById(task.folderId);
    var folderLabel = folder ? '📁 ' + escapeHtml(folder.name) : '';
    var durationLabel = formatDuration(task.estimatedMinutes);
    var recurringBadge = task.recurringSourceId ? '<span class="recurring-badge">🔄</span>' : '';
    var subtaskSection = '';
    var subCount = (task.subtasks || []).length;
    var subDone = task.subtasks ? task.subtasks.filter(function (s) { return s.completed; }).length : 0;
    var subEmpty = subCount === 0;
    var subLabel = subEmpty ? '▸ 子任务' : ('▾ 子任务（' + subDone + '/' + subCount + ' 已完成）');
    var subListHtml = '';
    if (task.subtasks) {
      task.subtasks.forEach(function (sub) {
        subListHtml +=
          '<div class="subtask-item' + (sub.completed ? ' completed' : '') + '">' +
            '<button class="subtask-checkbox" data-action="subtask-toggle" data-task-id="' + task.id + '" data-subtask-id="' + sub.id + '">✓</button>' +
            '<span class="subtask-title">' + escapeHtml(sub.title) + '</span>' +
            (sub.estimatedMinutes ? '<span class="subtask-duration">' + sub.estimatedMinutes + '分钟</span>' : '') +
            '<button class="subtask-delete" data-action="subtask-delete" data-task-id="' + task.id + '" data-subtask-id="' + sub.id + '">✕</button>' +
          '</div>';
      });
    }
    subtaskSection =
      '<div class="subtask-section">' +
        '<button class="subtask-toggle" data-action="toggle-subtasks" data-task-id="' + task.id + '">' + subLabel + '</button>' +
        '<div class="subtask-list"' + (subEmpty ? ' style="display:none"' : '') + '>' +
          subListHtml +
          '<div class="subtask-add-row">' +
            '<input class="subtask-add-input" placeholder="添加子任务..." autocomplete="off">' +
            '<input class="subtask-add-dur" placeholder="分钟" type="number" min="1" max="1440">' +
            '<button class="subtask-add-confirm" data-action="subtask-add" data-task-id="' + task.id + '">+</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    div.innerHTML =
      '<span class="task-drag-handle" title="拖拽排序">⠿</span>' +
      '<button class="task-checkbox" data-action="toggle" title="标记完成/未完成">✓</button>' +
      '<div class="task-content">' +
        '<div class="task-title">' + recurringBadge + escapeHtml(task.title) + '</div>' +
        (task.desc ? '<div class="task-desc">' + escapeHtml(task.desc) + '</div>' : '') +
        '<div class="task-meta">' +
          '<span class="task-priority priority-' + task.priority + '">' + priorityLabel + '</span>' +
          (task.category ? '<span class="task-category">' + categoryLabel + '</span>' : '') +
          (folderLabel ? '<span class="task-folder">' + folderLabel + '</span>' : '') +
          (durationLabel ? '<span class="task-duration">⏱ ' + durationLabel + '</span>' : '') +
          (task.dueDate ? '<span class="task-due ' + dateClass + '">📅 ' + dateText + '</span>' : '') +
          (task.trackingId ? '<span class="task-tracking">🔍 追踪中</span>' : '') +
        '</div>' +
      '</div>' +
      subtaskSection +
      '<div class="task-actions">' +
        '<button class="edit-btn" data-action="edit" title="编辑">✏️</button>' +
        '<button class="delete-btn" data-action="delete" title="删除">🗑</button>' +
      '</div>';

    return div;
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    if (activeFolder === '__recurring__') {
      renderRecurringView();
      updateStats();
      return;
    }
    var filtered = getFilteredTasks();

    taskList.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.classList.add('visible');
      if (tasks.length > 0) {
        emptyStateMsg.textContent = '没有匹配的任务';
      } else {
        emptyStateMsg.textContent = '暂无任务，添加一个吧！';
      }
    } else {
      emptyState.classList.remove('visible');
    }

    if (dateGrouping && filtered.length > 0) {
      var groups = {};
      groupOrder.forEach(function (k) { groups[k] = []; });
      filtered.forEach(function (t) {
        var g = getDateGroup(t);
        if (groups[g]) groups[g].push(t);
      });

      var collapsed = JSON.parse(localStorage.getItem('todoDateGroupCollapsed') || '{}');

      groupOrder.forEach(function (key) {
        var items = groups[key];
        if (items.length === 0) return;
        var g = groupLabels[key];
        var isCollapsed = key === 'today' ? false : (collapsed[key] === undefined ? true : collapsed[key] === true);

        // Compute date annotation for group header
        var dateSuffix = '';
        if (key !== 'none') {
          var unique = {};
          items.forEach(function (t) { if (t.dueDate) unique[t.dueDate] = true; });
          var dates = Object.keys(unique).sort();
          if (dates.length === 1) {
            dateSuffix = formatDateShort(dates[0]);
          } else if (dates.length > 1) {
            dateSuffix = formatDateShort(dates[0]) + ' - ' + formatDateShort(dates[dates.length - 1]);
          }
        }

        var title = document.createElement('div');
        title.className = 'date-group-title date-group-title-' + groupCss[key] + (isCollapsed ? ' collapsed' : '');
        title.dataset.groupKey = key;
        title.innerHTML = '<span class="group-arrow">▼</span>' + g.icon + ' ' + g.label + (dateSuffix ? '<span class="date-suffix">' + dateSuffix + '</span>' : '') + '<span class="group-count">' + items.length + '</span>';
        taskList.appendChild(title);

        var body = document.createElement('div');
        body.className = 'date-group-body';
        if (isCollapsed) body.classList.add('collapsed');
        items.forEach(function (task) {
          body.appendChild(renderTaskItem(task));
        });
        taskList.appendChild(body);
      });
    } else {
      filtered.forEach(function (task) {
        taskList.appendChild(renderTaskItem(task));
      });
    }

    updateStats();
  }

  function renderRecurringView() {
    taskList.innerHTML = '';
    emptyState.classList.remove('visible');

    var container = document.createElement('div');
    container.className = 'recurring-view visible';

    var header = document.createElement('div');
    header.className = 'recurring-view-header';
    header.textContent = '🔄 每日任务';
    container.appendChild(header);

    if (recurringTasks.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'recurring-empty';
      empty.innerHTML = '<div class="recurring-empty-icon">🔄</div><p>暂无每日任务规则</p>';
      container.appendChild(empty);
    } else {
      var today = getToday();
      recurringTasks.forEach(function (rule) {
        var card = document.createElement('div');
        card.className = 'recurring-card';
        card.style.cursor = 'grab';
        card.dataset.recurringId = rule.id;

        var titleRow = document.createElement('div');
        titleRow.style.cssText = 'display:flex;align-items:flex-start;gap:8px;';

        var dragHandle = document.createElement('span');
        dragHandle.className = 'rec-drag-handle';
        dragHandle.style.cssText = 'cursor:grab;color:var(--text-muted);font-size:.9rem;line-height:1;user-select:none;';
        dragHandle.textContent = '⠿';
        dragHandle.title = '拖拽排序';
        titleRow.appendChild(dragHandle);

        var titleEl = document.createElement('div');
        titleEl.className = 'recurring-card-title';
        titleEl.style.flex = '1';
        titleEl.textContent = rule.title;
        titleRow.appendChild(titleEl);

        card.appendChild(titleRow);

        var metaEl = document.createElement('div');
        metaEl.className = 'recurring-card-meta';
        var priorityLabel = { high: '🔴 高', medium: '🟡 中', low: '🟢 低' }[rule.priority];
        var categoryLabel = { work: '💼 工作', study: '📚 学习', life: '🏠 生活', other: '📌 其他' }[rule.category] || '';
        var totalMin = rule.totalEstimatedMinutes || rule.estimatedMinutes || null;
        var dailyMin = getDailyMinutes(rule);
        var durationLabel = '';
        if (totalMin) {
          durationLabel = '⏱ 总' + totalMin + '分钟';
          if (dailyMin && dailyMin !== totalMin) {
            durationLabel += '（日' + dailyMin + '分钟）';
          }
        }
        var parts = [];
        if (priorityLabel) parts.push('<span class="task-priority priority-' + rule.priority + '">' + priorityLabel + '</span>');
        if (categoryLabel) parts.push('<span class="task-category">' + categoryLabel + '</span>');
        if (durationLabel) parts.push('<span class="task-duration">⏱ ' + durationLabel + '</span>');
        metaEl.innerHTML = parts.join('');
        card.appendChild(metaEl);

        var repeatLabel = { daily: '每天', weekday: '工作日', weekend: '休息日', weekly: '每周指定日' }[rule.repeatType || 'daily'];
        var datesEl = document.createElement('div');
        datesEl.className = 'recurring-card-dates';
        datesEl.textContent = '🔄 ' + repeatLabel + ' · 📅 ' + rule.startDate + ' — ' + rule.endDate;
        card.appendChild(datesEl);

        if (rule.desc) {
          var descEl = document.createElement('div');
          descEl.className = 'recurring-card-desc';
          descEl.textContent = rule.desc;
          descEl.style.cssText = 'font-size:.85rem;color:var(--text-secondary);margin-top:4px;line-height:1.4;';
          card.appendChild(descEl);
        }

        // Progress bar
        var start = new Date(rule.startDate + 'T00:00:00');
        var end = new Date(rule.endDate + 'T00:00:00');
        var todayD = new Date(today + 'T00:00:00');
        var totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
        var elapsed = Math.round((todayD - start) / (1000 * 60 * 60 * 24)) + 1;
        if (elapsed > totalDays) elapsed = totalDays;
        if (elapsed < 0) elapsed = 0;
        var pct = ((elapsed / totalDays) * 100).toFixed(2);

        var progressEl = document.createElement('div');
        progressEl.className = 'recurring-progress';
        progressEl.innerHTML =
          '<span>' + elapsed + '/' + totalDays + '天（' + pct + '%）</span>' +
          '<div class="recurring-bar"><div class="recurring-bar-fill' + (pct === 100 ? ' done' : '') + '" style="width:' + pct + '%"></div></div>';
        card.appendChild(progressEl);

        // Status + delete
        var footerEl = document.createElement('div');
        footerEl.className = 'recurring-card-footer';

        var statusEl = document.createElement('div');
        statusEl.className = 'recurring-status';
        var isOver = today > rule.endDate;
        var genToday = rule.lastGenDate === today;
        if (isOver) {
          statusEl.className += ' ended';
          statusEl.textContent = '⏹ 已结束';
        } else if (genToday) {
          statusEl.className += ' done';
          statusEl.textContent = '✅ 今日已生成';
        } else {
          statusEl.className += ' pending';
          statusEl.textContent = '⏳ 今日未生成';
        }
        footerEl.appendChild(statusEl);

        var repushBtn = document.createElement('button');
        repushBtn.className = 'btn-secondary btn-sm';
        repushBtn.textContent = '🔄 重推';
        repushBtn.dataset.action = 'repush-recurring';
        repushBtn.dataset.recurringId = rule.id;
        repushBtn.title = '重新推送今日任务';
        footerEl.appendChild(repushBtn);

        var editBtn = document.createElement('button');
        editBtn.className = 'btn-secondary btn-sm';
        editBtn.textContent = '✏️ 修改';
        editBtn.dataset.action = 'edit-recurring';
        editBtn.dataset.recurringId = rule.id;
        footerEl.appendChild(editBtn);

        var delBtn = document.createElement('button');
        delBtn.className = 'btn-danger btn-sm';
        delBtn.textContent = '🗑 删除';
        delBtn.dataset.recurringId = rule.id;
        footerEl.appendChild(delBtn);

        card.appendChild(footerEl);
        container.appendChild(card);
      });
    }

    taskList.appendChild(container);
  }

  function enterRecurringEditMode(id) {
    var rule = recurringTasks.find(function (r) { return r.id === id; });
    if (!rule) return;

    var card = taskList.querySelector('[data-recurring-id="' + id + '"]');
    if (!card) {
      card = taskList.querySelector('.recurring-card');
      while (card) {
        var del = card.querySelector('[data-recurring-id="' + id + '"]');
        if (del) break;
        card = card.nextElementSibling;
        if (card && !card.classList.contains('recurring-card')) card = null;
      }
    }
    if (!card) return;
    card = card.closest('.recurring-card');
    if (!card) return;

    // Save original HTML to restore on cancel
    var origHTML = card.innerHTML;
    card.dataset.origHtml = origHTML;

    var repeatTypeVal = rule.repeatType || 'daily';
    var wd = rule.weeklyDays || [];

    var folderOpts = '';
    folders.forEach(function (f) {
      var sel = rule.folderId === f.id ? ' selected' : '';
      folderOpts += '<option value="' + escapeHtml(f.id) + '"' + sel + '>' + escapeHtml(f.name) + '</option>';
    });

    card.innerHTML =
      '<div class="recurring-edit-form">' +
        '<input class="rec-edit-title" value="' + escapeHtml(rule.title) + '" placeholder="任务标题" style="width:100%;padding:8px 12px;margin-bottom:8px;border:1.5px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text);font-family:inherit;font-size:.9rem;box-sizing:border-box;">' +

        '<div class="rec-edit-row" style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">' +
          '<select class="rec-edit-priority" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text);font-family:inherit;font-size:.82rem;">' +
            '<option value="low"' + (rule.priority === 'low' ? ' selected' : '') + '>🟢 低</option>' +
            '<option value="medium"' + (rule.priority === 'medium' ? ' selected' : '') + '>🟡 中</option>' +
            '<option value="high"' + (rule.priority === 'high' ? ' selected' : '') + '>🔴 高</option>' +
          '</select>' +
          '<select class="rec-edit-category" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text);font-family:inherit;font-size:.82rem;">' +
            '<option value="">无分类</option>' +
            '<option value="work"' + (rule.category === 'work' ? ' selected' : '') + '>💼 工作</option>' +
            '<option value="study"' + (rule.category === 'study' ? ' selected' : '') + '>📚 学习</option>' +
            '<option value="life"' + (rule.category === 'life' ? ' selected' : '') + '>🏠 生活</option>' +
            '<option value="other"' + (rule.category === 'other' ? ' selected' : '') + '>📌 其他</option>' +
          '</select>' +
          '<select class="rec-edit-folder" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text);font-family:inherit;font-size:.82rem;">' +
            '<option value="">无文件夹</option>' +
            folderOpts +
          '</select>' +
        '</div>' +

        '<div class="rec-edit-row" style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;align-items:center;">' +
          '<span style="font-size:.82rem;color:var(--text-secondary);">总时长</span>' +
          '<input class="rec-edit-duration" type="number" value="' + (rule.totalEstimatedMinutes || rule.estimatedMinutes || '') + '" placeholder="分钟" min="1" max="1440" style="padding:8px 12px;width:80px;border:1.5px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text);font-family:inherit;font-size:.82rem;">' +
          '<span style="font-size:.82rem;color:var(--text-muted);">分钟</span>' +
        '</div>' +

        '<textarea class="rec-edit-desc" placeholder="描述（可选）" style="width:100%;padding:8px 12px;margin-bottom:8px;border:1.5px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text);font-family:inherit;font-size:.85rem;resize:vertical;box-sizing:border-box;min-height:40px;">' + escapeHtml(rule.desc || '') + '</textarea>' +

        '<div class="rec-edit-row" style="display:flex;gap:8px;margin-bottom:10px;align-items:center;flex-wrap:wrap;">' +
          '<span style="font-size:.82rem;color:var(--text-secondary);">日期</span>' +
          '<input class="rec-edit-start" type="date" value="' + rule.startDate + '" style="padding:6px 10px;border:1.5px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text);font-family:inherit;font-size:.82rem;">' +
          '<span style="font-size:.82rem;color:var(--text-muted);">至</span>' +
          '<input class="rec-edit-end" type="date" value="' + rule.endDate + '" style="padding:6px 10px;border:1.5px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text);font-family:inherit;font-size:.82rem;">' +
        '</div>' +

        '<div class="rec-edit-row" style="margin-bottom:10px;">' +
          '<span style="font-size:.82rem;color:var(--text-secondary);display:block;margin-bottom:6px;">重复模式</span>' +
          '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
            '<label class="repeat-radio" style="padding:4px 10px;border:1px solid var(--border);border-radius:20px;font-size:.8rem;cursor:pointer;' + (repeatTypeVal === 'daily' ? 'background:var(--accent);color:#fff;border-color:var(--accent);' : '') + '"><input type="radio" name="rec-edit-repeat" value="daily"' + (repeatTypeVal === 'daily' ? ' checked' : '') + ' style="display:none;"><span>每天</span></label>' +
            '<label class="repeat-radio" style="padding:4px 10px;border:1px solid var(--border);border-radius:20px;font-size:.8rem;cursor:pointer;' + (repeatTypeVal === 'weekday' ? 'background:var(--accent);color:#fff;border-color:var(--accent);' : '') + '"><input type="radio" name="rec-edit-repeat" value="weekday"' + (repeatTypeVal === 'weekday' ? ' checked' : '') + ' style="display:none;"><span>工作日</span></label>' +
            '<label class="repeat-radio" style="padding:4px 10px;border:1px solid var(--border);border-radius:20px;font-size:.8rem;cursor:pointer;' + (repeatTypeVal === 'weekend' ? 'background:var(--accent);color:#fff;border-color:var(--accent);' : '') + '"><input type="radio" name="rec-edit-repeat" value="weekend"' + (repeatTypeVal === 'weekend' ? ' checked' : '') + ' style="display:none;"><span>休息日</span></label>' +
            '<label class="repeat-radio" style="padding:4px 10px;border:1px solid var(--border);border-radius:20px;font-size:.8rem;cursor:pointer;' + (repeatTypeVal === 'weekly' ? 'background:var(--accent);color:#fff;border-color:var(--accent);' : '') + '"><input type="radio" name="rec-edit-repeat" value="weekly"' + (repeatTypeVal === 'weekly' ? ' checked' : '') + ' style="display:none;"><span>每周指定日</span></label>' +
          '</div>' +
        '</div>' +

        '<div class="rec-edit-weekdays" style="display:' + (repeatTypeVal === 'weekly' ? 'flex' : 'none') + ';gap:4px;margin-bottom:10px;">' +
          [0, 1, 2, 3, 4, 5, 6].map(function (d) {
            var names = ['日', '一', '二', '三', '四', '五', '六'];
            var checked = wd.indexOf(d) !== -1;
            return '<label class="weekday-chip" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border:1px solid var(--border);border-radius:50%;font-size:.8rem;cursor:pointer;' + (checked ? 'background:var(--primary);color:#fff;border-color:var(--primary);' : '') + '"><input type="checkbox" data-wd="' + d + '"' + (checked ? ' checked' : '') + ' style="display:none;"><span>' + names[d] + '</span></label>';
          }).join('') +
        '</div>' +

        '<div class="rec-edit-actions" style="display:flex;gap:8px;justify-content:flex-end;">' +
          '<button class="rec-edit-save btn-primary btn-sm" style="padding:6px 14px;font-size:.82rem;">保存</button>' +
          '<button class="rec-edit-cancel btn-secondary btn-sm" style="padding:6px 14px;font-size:.82rem;">取消</button>' +
        '</div>' +
      '</div>';

    // Bind radio change → show/hide weekday picker
    var radios = card.querySelectorAll('input[name="rec-edit-repeat"]');
    var weekdaysDiv = card.querySelector('.rec-edit-weekdays');
    radios.forEach(function (r) {
      r.addEventListener('change', function () {
        weekdaysDiv.style.display = this.value === 'weekly' ? 'flex' : 'none';
        // Update radio label styles
        card.querySelectorAll('.repeat-radio').forEach(function (l) {
          var inp = l.querySelector('input');
          l.style.background = inp && inp.checked ? 'var(--accent)' : '';
          l.style.color = inp && inp.checked ? '#fff' : '';
          l.style.borderColor = inp && inp.checked ? 'var(--accent)' : '';
        });
      });
    });

    // Bind weekday chip toggle
    var chips = card.querySelectorAll('.weekday-chip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var cb = this.querySelector('input');
        cb.checked = !cb.checked;
        this.style.background = cb.checked ? 'var(--primary)' : '';
        this.style.color = cb.checked ? '#fff' : '';
        this.style.borderColor = cb.checked ? 'var(--primary)' : '';
      });
    });

    // Bind radio label clicks
    card.querySelectorAll('.repeat-radio').forEach(function (l) {
      l.addEventListener('click', function () {
        var inp = this.querySelector('input');
        inp.checked = true;
        inp.dispatchEvent(new Event('change'));
      });
    });

    // Save button
    card.querySelector('.rec-edit-save').addEventListener('click', function () {
      var title = card.querySelector('.rec-edit-title').value.trim();
      if (!title) { showToast('标题不能为空'); return; }
      var startVal = card.querySelector('.rec-edit-start').value;
      var endVal = card.querySelector('.rec-edit-end').value;
      if (!startVal || !endVal) { showToast('请设置日期范围'); return; }
      if (endVal < startVal) { showToast('截止日期不能早于起始日期'); return; }

      rule.title = title;
      rule.priority = card.querySelector('.rec-edit-priority').value;
      rule.category = card.querySelector('.rec-edit-category').value || '';
      rule.folderId = card.querySelector('.rec-edit-folder').value || null;
      rule.totalEstimatedMinutes = card.querySelector('.rec-edit-duration').value ? parseInt(card.querySelector('.rec-edit-duration').value, 10) : null;
      rule.desc = card.querySelector('.rec-edit-desc').value.trim();
      rule.startDate = startVal;
      rule.endDate = endVal;
      rule.repeatType = card.querySelector('input[name="rec-edit-repeat"]:checked').value;
      rule.weeklyDays = [];
      if (rule.repeatType === 'weekly') {
        card.querySelectorAll('.rec-edit-weekdays input:checked').forEach(function (c) {
          rule.weeklyDays.push(parseInt(c.dataset.wd, 10));
        });
        rule.weeklyDays.sort(function (a, b) { return a - b; });
      }
      saveRecurring();
      render();
      showToast('每日任务已更新');
    });

    // Cancel button
    card.querySelector('.rec-edit-cancel').addEventListener('click', function () {
      card.innerHTML = card.dataset.origHtml;
      delete card.dataset.origHtml;
      render();
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Task CRUD ────────────────────────────────────────────────
  function addTask(title, priority, dueDate, category, desc, folderId, estimatedMinutes) {
    tasks.unshift({
      id: generateId(),
      title: title.trim(),
      priority: priority || 'medium',
      dueDate: dueDate || '',
      category: category || '',
      desc: (desc || '').trim(),
      folderId: folderId || null,
      estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
      completed: false,
      createdAt: Date.now()
    });
    saveTasks();
    render();
    var firstItem = taskList.querySelector('.task-item');
    if (firstItem) {
      firstItem.classList.add('task-enter');
      firstItem.addEventListener('animationend', function () {
        firstItem.classList.remove('task-enter');
      }, { once: true });
    }
    renderFolderList();
    updateFolderSelect();
  }

  function toggleTask(id) {
    var task = tasks.find(function (t) { return t.id === id; });
    if (task) {
      task.completed = !task.completed;
      if (task.trackingId) {
        var rule = trackingRules.find(function (r) { return r.id === task.trackingId; });
        if (rule) {
          if (task.completed) {
            rule.active = false;
          } else {
            rule.active = true;
            rule.currentTaskId = task.id;
          }
          saveTrackingRules();
        }
      }
      saveTasks();
      render();
      renderFolderList();
    }
  }

  function deleteTask(id) {
    var task = tasks.find(function (t) { return t.id === id; });
    if (task && task.trackingId) {
      trackingRules = trackingRules.filter(function (r) { return r.id !== task.trackingId; });
      saveTrackingRules();
    }
    tasks = tasks.filter(function (t) { return t.id !== id; });
    saveTasks();
    render();
    renderFolderList();
    showToast('任务已删除');
  }

  function updateTask(id, updates) {
    var task = tasks.find(function (t) { return t.id === id; });
    if (task) {
      Object.assign(task, updates);
      saveTasks();
      render();
      renderFolderList();
      updateFolderSelect();
    }
  }

  // ── Subtask Helpers ──────────────────────────────────────────
  function getSubtaskTotal(task) {
    if (!task.subtasks) return 0;
    return task.subtasks.reduce(function (sum, s) { return sum + (s.estimatedMinutes || 0); }, 0);
  }

  function addSubtask(taskId, title, est) {
    var task = tasks.find(function (t) { return t.id === taskId; });
    if (!task) return false;
    if (!task.subtasks) task.subtasks = [];
    var total = getSubtaskTotal(task);
    if (task.estimatedMinutes && total + est > task.estimatedMinutes) return false;
    task.subtasks.push({
      id: generateId(),
      title: title.trim(),
      estimatedMinutes: est || null,
      completed: false,
      createdAt: Date.now()
    });
    saveTasks();
    return true;
  }

  function toggleSubtask(taskId, subId) {
    var task = tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return;
    var sub = task.subtasks.find(function (s) { return s.id === subId; });
    if (sub) { sub.completed = !sub.completed; saveTasks(); }
  }

  function deleteSubtask(taskId, subId) {
    var task = tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return;
    task.subtasks = task.subtasks.filter(function (s) { return s.id !== subId; });
    saveTasks();
  }

  // ── Edit mode ────────────────────────────────────────────────
  function enterEditMode(taskId) {
    var task = tasks.find(function (t) { return t.id === taskId; });
    if (!task) return;

    var li = taskList.querySelector('[data-id="' + taskId + '"]');
    if (!li) return;
    li.classList.add('editing');

    var checkbox = li.querySelector('.task-checkbox');
    checkbox.style.display = 'none';

    var content = li.querySelector('.task-content');
    var title = task.title;
    var desc = task.desc || '';
    var priority = task.priority;
    var category = task.category || '';
    var dueDate = task.dueDate || '';
    var folderId = task.folderId || '';
    var estimatedMinutes = task.estimatedMinutes || '';

    var folderOptions = folders.map(function (f) {
      return '<option value="' + f.id + '"' + (f.id === folderId ? ' selected' : '') + '>📁 ' + escapeHtml(f.name) + '</option>';
    }).join('');

    content.innerHTML =
      '<input class="edit-input" value="' + escapeHtml(title) + '" placeholder="任务标题">' +
      '<textarea class="edit-textarea" rows="2" placeholder="描述（可选）">' + escapeHtml(desc) + '</textarea>' +
      '<div class="edit-meta">' +
        '<select class="edit-priority">' +
          '<option value="low"' + (priority === 'low' ? ' selected' : '') + '>🟢 低</option>' +
          '<option value="medium"' + (priority === 'medium' ? ' selected' : '') + '>🟡 中</option>' +
          '<option value="high"' + (priority === 'high' ? ' selected' : '') + '>🔴 高</option>' +
        '</select>' +
        '<input type="date" class="edit-due" value="' + escapeHtml(dueDate) + '">' +
        '<select class="edit-category">' +
          '<option value="">分类</option>' +
          '<option value="work"' + (category === 'work' ? ' selected' : '') + '>💼 工作</option>' +
          '<option value="study"' + (category === 'study' ? ' selected' : '') + '>📚 学习</option>' +
          '<option value="life"' + (category === 'life' ? ' selected' : '') + '>🏠 生活</option>' +
          '<option value="other"' + (category === 'other' ? ' selected' : '') + '>📌 其他</option>' +
        '</select>' +
        '<select class="edit-folder">' +
          '<option value="">📁 文件夹</option>' +
          folderOptions +
        '</select>' +
        '<input type="number" class="edit-duration" value="' + estimatedMinutes + '" placeholder="时长(分钟)" min="1" max="1440" step="1">' +
      '</div>' +
      '<div class="edit-actions">' +
        '<button class="edit-save">保存</button>' +
        '<button class="edit-cancel">取消</button>' +
      '</div>';

    var actions = li.querySelector('.task-actions');
    if (actions) actions.style.display = 'none';

    var saveBtn = li.querySelector('.edit-save');
    var cancelBtn = li.querySelector('.edit-cancel');
    var editInput = li.querySelector('.edit-input');

    saveBtn.addEventListener('click', function () {
      var newTitle = editInput.value.trim();
      if (!newTitle) {
        showToast('标题不能为空');
        return;
      }
      updateTask(taskId, {
        title: newTitle,
        desc: li.querySelector('.edit-textarea').value.trim(),
        priority: li.querySelector('.edit-priority').value,
        dueDate: li.querySelector('.edit-due').value,
        category: li.querySelector('.edit-category').value,
        folderId: li.querySelector('.edit-folder').value || null,
        estimatedMinutes: li.querySelector('.edit-duration').value ? parseInt(li.querySelector('.edit-duration').value, 10) : null
      });
      showToast('任务已更新');
    });

    cancelBtn.addEventListener('click', function () {
      render();
    });

    editInput.focus();
    editInput.select();
  }

  // ── Export / Import ──────────────────────────────────────────
  function exportData() {
    var data = JSON.stringify({ tasks: tasks, folders: folders, recurringTasks: recurringTasks, trackingRules: trackingRules }, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'todo-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出');
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        if (data && Array.isArray(data.tasks)) {
          tasks = data.tasks;
          if (Array.isArray(data.folders)) folders = data.folders;
          if (Array.isArray(data.recurringTasks)) recurringTasks = data.recurringTasks;
          if (Array.isArray(data.trackingRules)) trackingRules = data.trackingRules;
        } else if (Array.isArray(data)) {
          tasks = data;
        } else {
          throw new Error('Invalid format');
        }
        saveTasks();
        saveFolders();
        saveRecurring();
        saveTrackingRules();
        render();
        renderFolderList();
        updateFolderSelect();
        showToast('数据已导入（' + tasks.length + ' 条）');
      } catch (err) {
        showToast('导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file);
  }

  // ── Event Delegation ─────────────────────────────────────────
  taskList.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var li = btn.closest('.task-item');
    if (!li) return;
    var id = li.dataset.id;
    var action = btn.dataset.action;

    if (action === 'toggle') {
      toggleTask(id);
    } else if (action === 'edit') {
      enterEditMode(id);
    } else if (action === 'delete') {
      confirm('确定要删除这个任务吗？').then(function (ok) {
        if (ok) deleteTask(id);
      });
    }
  });

  // Double-click task to edit
  taskList.addEventListener('dblclick', function (e) {
    var item = e.target.closest('.task-item');
    if (!item || item.classList.contains('editing')) return;
    var id = item.dataset.id;
    if (id) enterEditMode(id);
  });

  // Recurring view delete / edit
  taskList.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-recurring-id]');
    if (!btn) return;
    var id = btn.dataset.recurringId;
    var rule = recurringTasks.find(function (r) { return r.id === id; });
    if (!rule) return;
    if (btn.dataset.action === 'edit-recurring') {
      enterRecurringEditMode(id);
      return;
    }
    if (btn.dataset.action === 'repush-recurring') {
      var todayVal = getToday();
      if (todayVal < rule.startDate || todayVal > rule.endDate) {
        showToast('不在日期范围内，无法推送');
        return;
      }
      var exists = tasks.some(function (t) { return t.recurringSourceId === id && t.dueDate === todayVal; });
      if (exists) {
        showToast('今日任务已存在');
        return;
      }
      tasks.unshift({
        id: generateId(),
        title: rule.title,
        priority: rule.priority || 'medium',
        dueDate: todayVal,
        category: rule.category || '',
        desc: (rule.desc || '').trim(),
        folderId: rule.folderId || null,
        estimatedMinutes: getDailyMinutes(rule),
        completed: false,
        createdAt: Date.now(),
        recurringSourceId: rule.id
      });
      rule.lastGenDate = todayVal;
      saveTasks();
      saveRecurring();
      render();
      showToast('今日任务已推送');
      return;
    }
    confirm('确定要删除每日任务 "' + rule.title + '" 吗？\n已生成的普通任务不受影响。').then(function (ok) {
      if (ok) {
        recurringTasks = recurringTasks.filter(function (r) { return r.id !== id; });
        saveRecurring();
        render();
        showToast('每日任务已删除');
      }
    });
  });

  // Date group collapse toggle (persistent delegation)
  taskList.addEventListener('click', function (e) {
    var title = e.target.closest('.date-group-title');
    if (!title) return;
    var key = title.dataset.groupKey;
    title.classList.toggle('collapsed');
    var nowCollapsed = title.classList.contains('collapsed');
    var state = JSON.parse(localStorage.getItem('todoDateGroupCollapsed') || '{}');
    state[key] = nowCollapsed;
    localStorage.setItem('todoDateGroupCollapsed', JSON.stringify(state));
    var body = title.nextElementSibling;
    if (body && body.classList.contains('date-group-body')) {
      animateBody(body, nowCollapsed);
    }
  });

  function animateBody(body, collapse) {
    // Prevent transition interference during measurement
    body.style.transition = 'none';
    body.style.height = '';
    body.style.overflow = '';
    body.offsetHeight;
    var h = body.scrollHeight;

    if (collapse) {
      // Lock current height
      body.style.height = h + 'px';
      body.style.overflow = 'hidden';
      body.offsetHeight;
      body.style.transition = 'height .35s ease';
      body.style.height = '0';
      body.classList.add('collapsed');
    } else {
      // Snap to 0, then animate to full
      body.style.height = '0';
      body.style.overflow = 'hidden';
      body.classList.remove('collapsed');
      body.offsetHeight;
      body.style.transition = 'height .35s ease';
      body.style.height = h + 'px';
    }

    body.addEventListener('transitionend', function cleanup() {
      body.style.transition = '';
      body.style.height = '';
      body.style.overflow = '';
      body.removeEventListener('transitionend', cleanup);
    }, { once: true });
  }

  // Right-click on task for move/delete
  taskList.addEventListener('contextmenu', function (e) {
    var item = e.target.closest('.task-item');
    if (!item || item.classList.contains('editing')) return;
    e.preventDefault();
    showTaskContextMenu(e.clientX, e.clientY, item.dataset.id);
  });

  // Press Enter in edit inputs to save
  taskList.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.classList.contains('edit-input')) {
      e.preventDefault();
      var li = e.target.closest('.task-item');
      if (li) {
        var saveBtn = li.querySelector('.edit-save');
        if (saveBtn) saveBtn.click();
      }
    }
    if (e.key === 'Escape') {
      var editing = taskList.querySelector('.task-item.editing');
      if (editing) {
        render();
      }
    }
  });

  // ── Drag & Drop ──────────────────────────────────────────────
  var drag = null; // { item, startX, startY, offsetX, offsetY, started, clone }

  function cancelDrag() {
    if (!drag) return;
    if (drag.clone) drag.clone.remove();
    if (drag.item) {
      drag.item.classList.remove('dragging');
      drag.item.style.opacity = '';
    }
    $$('.task-item.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
    drag = null;
  }

  taskList.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    var tag = e.target.tagName;
    if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    var item = e.target.closest('.task-item');
    if (!item || item.classList.contains('editing')) return;

    var rect = item.getBoundingClientRect();
    drag = {
      item: item,
      fromId: item.dataset.id,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      started: false,
      clone: null
    };

    function onMove(ev) {
      if (!drag) { document.removeEventListener('mousemove', onMove); return; }
      var dx = ev.clientX - drag.startX;
      var dy = ev.clientY - drag.startY;
      if (!drag.started) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        drag.started = true;
        var clone = drag.item.cloneNode(true);
        clone.classList.remove('dragging', 'drag-over');
        clone.style.cssText =
          'position:fixed;z-index:1000;opacity:0.85;pointer-events:none;' +
          'width:' + drag.item.offsetWidth + 'px;' +
          'box-shadow:0 10px 25px rgba(0,0,0,.25);transform:rotate(1deg);';
        document.body.appendChild(clone);
        drag.clone = clone;
        drag.item.classList.add('dragging');
        drag.item.style.opacity = '0.35';
      }

      drag.clone.style.left = (ev.clientX - drag.offsetX) + 'px';
      drag.clone.style.top = (ev.clientY - drag.offsetY) + 'px';

      var below = document.elementFromPoint(ev.clientX, ev.clientY);

      $$('.task-item.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
      if (below) {
        var target = below.closest('.task-item');
        if (target && target !== drag.item) {
          if (!dateGrouping || drag.item.closest('.date-group-body') === target.closest('.date-group-body')) {
            var r = target.getBoundingClientRect();
            if (ev.clientY < (r.top + r.bottom) / 2) {
              target.classList.add('drag-over');
            }
          }
        }
      }
    }

    function onUp(ev) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!drag) return;

      if (drag.started) {
        var below = document.elementFromPoint(ev.clientX, ev.clientY);
        var target = below ? below.closest('.task-item') : null;
        if (target && target !== drag.item) {
          var r = target.getBoundingClientRect();
          var dropBelow = ev.clientY > (r.top + r.bottom) / 2;
          var container = dateGrouping ? drag.item.closest('.date-group-body') : taskList;
          var visibleIds = Array.from(container.querySelectorAll('.task-item')).map(function (el) { return el.dataset.id; });
          var targetIdx = visibleIds.indexOf(target.dataset.id);
          var insertIdx = dropBelow ? targetIdx + 1 : targetIdx;
          var fromVisIdx = visibleIds.indexOf(drag.fromId);
          if (fromVisIdx !== -1 && fromVisIdx < insertIdx) insertIdx--;
          visibleIds = visibleIds.filter(function (id) { return id !== drag.fromId; });

          var newOrder = [];
          var used = {};
          visibleIds.forEach(function (id) {
            used[id] = true;
            var t = tasks.find(function (x) { return x.id === id; });
            if (t) newOrder.push(t);
          });
          var draggedTask = tasks.find(function (t) { return t.id === drag.fromId; });
          if (draggedTask) {
            newOrder.splice(insertIdx, 0, draggedTask);
            used[drag.fromId] = true;
          }
          tasks.forEach(function (t) {
            if (!used[t.id]) newOrder.push(t);
          });
          tasks = newOrder;
          sortSelect.value = 'manual';
          saveSort();
          saveTasks();
          render();
        }
      }
      cancelDrag();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  });

  // Drag-and-drop for recurring cards
  taskList.addEventListener('mousedown', function (e) {
    if (e.button !== 0 || drag) return;
    if (activeFolder !== '__recurring__') return;
    var tag = e.target.tagName;
    if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    var card = e.target.closest('.recurring-card');
    if (!card) return;

    var rect = card.getBoundingClientRect();
    drag = {
      item: card,
      fromId: card.dataset.recurringId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      started: false,
      clone: null
    };

    function onMove(ev) {
      if (!drag) { document.removeEventListener('mousemove', onMove); return; }
      var dx = ev.clientX - drag.startX;
      var dy = ev.clientY - drag.startY;
      if (!drag.started) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        drag.started = true;
        var clone = drag.item.cloneNode(true);
        clone.classList.remove('dragging', 'drag-over');
        clone.style.cssText =
          'position:fixed;z-index:1000;opacity:0.85;pointer-events:none;' +
          'width:' + drag.item.offsetWidth + 'px;' +
          'box-shadow:0 10px 25px rgba(0,0,0,.25);transform:rotate(1deg);';
        document.body.appendChild(clone);
        drag.clone = clone;
        drag.item.classList.add('dragging');
        drag.item.style.opacity = '0.35';
      }

      drag.clone.style.left = (ev.clientX - drag.offsetX) + 'px';
      drag.clone.style.top = (ev.clientY - drag.offsetY) + 'px';

      var below = document.elementFromPoint(ev.clientX, ev.clientY);
      $$('.recurring-card.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
      if (below) {
        var target = below.closest('.recurring-card');
        if (target && target !== drag.item) {
          var r = target.getBoundingClientRect();
          if (ev.clientY < (r.top + r.bottom) / 2) {
            target.classList.add('drag-over');
          }
        }
      }
    }

    function onUp(ev) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!drag) return;

      if (drag.started) {
        var below = document.elementFromPoint(ev.clientX, ev.clientY);
        var target = below ? below.closest('.recurring-card') : null;
        if (target && target !== drag.item) {
          var r = target.getBoundingClientRect();
          var dropBelow = ev.clientY > (r.top + r.bottom) / 2;
          var cards = Array.from(taskList.querySelectorAll('.recurring-card'));
          var ids = cards.map(function (el) { return el.dataset.recurringId; });
          var targetIdx = ids.indexOf(target.dataset.recurringId);
          var insertIdx = dropBelow ? targetIdx + 1 : targetIdx;
          var fromIdx = ids.indexOf(drag.fromId);
          if (fromIdx !== -1 && fromIdx < insertIdx) insertIdx--;
          ids = ids.filter(function (id) { return id !== drag.fromId; });

          var newOrder = [];
          var used = {};
          ids.forEach(function (id) {
            used[id] = true;
            var r = recurringTasks.find(function (x) { return x.id === id; });
            if (r) newOrder.push(r);
          });
          var draggedRule = recurringTasks.find(function (r) { return r.id === drag.fromId; });
          if (draggedRule) {
            newOrder.splice(insertIdx, 0, draggedRule);
            used[drag.fromId] = true;
          }
          recurringTasks.forEach(function (r) {
            if (!used[r.id]) newOrder.push(r);
          });
          recurringTasks = newOrder;
          saveRecurring();
          render();
        }
      }
      cancelDrag();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drag) {
      cancelDrag();
      e.stopImmediatePropagation();
    }
  });

  // ── Add Form ─────────────────────────────────────────────────
  addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var title = titleInput.value.trim();
    if (!title) {
      showToast('请输入任务标题');
      return;
    }

    if (recurringCheck.checked) {
      var startVal = recurringStart.value;
      var endVal = recurringEnd.value;
      if (!startVal || !endVal) {
        showToast('请设置日期范围');
        return;
      }
      if (endVal < startVal) {
        showToast('截止日期不能早于起始日期');
        return;
      }
      var rule = {
        id: generateId(),
        title: title,
        priority: prioritySelect.value,
        category: categorySelect.value,
        folderId: folderSelect.value || null,
        desc: descInput.value.trim(),
        totalEstimatedMinutes: durationInput.value ? parseInt(durationInput.value, 10) : null,
        startDate: startVal,
        endDate: endVal,
        repeatType: getSelectedRepeatType(),
        weeklyDays: getSelectedRepeatType() === 'weekly' ? getSelectedWeekdays() : [],
        lastGenDate: null,
        createdAt: Date.now(),
        active: true
      };
      recurringTasks.unshift(rule);
      saveRecurring();

      var today = getToday();
      if (today >= startVal && today <= endVal) {
        rule.lastGenDate = today;
        var task = {
          id: generateId(),
          title: title,
          priority: rule.priority,
          dueDate: today,
          category: rule.category,
          desc: rule.desc,
          folderId: rule.folderId,
          estimatedMinutes: getDailyMinutes(rule),
          completed: false,
          createdAt: Date.now(),
          recurringSourceId: rule.id
        };
        tasks.unshift(task);
        saveTasks();
        saveRecurring();
        showToast('每日任务已创建，今日任务已生成');
      } else {
        showToast('每日任务已创建');
      }
    } else if (trackingCheck.checked) {
      var dueVal = dueDateInput.value;
      if (!dueVal) {
        showToast('追踪任务必须设置截止日期');
        return;
      }
      var taskId = generateId();
      var trkRule = {
        id: generateId(),
        title: title,
        priority: prioritySelect.value,
        category: categorySelect.value,
        folderId: folderSelect.value || null,
        desc: descInput.value.trim(),
        estimatedMinutes: durationInput.value ? parseInt(durationInput.value, 10) : null,
        currentTaskId: taskId,
        active: true,
        createdAt: Date.now()
      };
      trackingRules.unshift(trkRule);
      saveTrackingRules();

      tasks.unshift({
        id: taskId,
        title: title,
        priority: trkRule.priority,
        dueDate: dueVal,
        category: trkRule.category,
        desc: trkRule.desc,
        folderId: trkRule.folderId,
        estimatedMinutes: trkRule.estimatedMinutes,
        completed: false,
        createdAt: Date.now(),
        trackingId: trkRule.id
      });
      saveTasks();
      showToast('追踪任务已创建');
    } else {
      addTask(
        title,
        prioritySelect.value,
        dueDateInput.value,
        categorySelect.value,
        descInput.value,
        folderSelect.value || null,
        durationInput.value || null
      );
    }

    titleInput.value = '';
    descInput.value = '';
    dueDateInput.value = '';
    dueDateInput.disabled = false;
    categorySelect.value = '';
    folderSelect.value = '';
    durationInput.value = '';
    recurringCheck.checked = false;
    trackingCheck.checked = false;
    recurringStart.value = '';
    recurringEnd.value = '';
    recurringOptions.classList.remove('open');
    weekdayPicker.classList.remove('open');
    repeatTypeRadios.forEach(function (r) { r.checked = (r.value === 'daily'); });
    weekdayChips.forEach(function (c) { c.checked = false; });
    titleInput.focus();
  });

  toggleExtraBtn.addEventListener('click', function () {
    extraVisible = !extraVisible;
    extraPanel.classList.toggle('collapsed', !extraVisible);
    var fields = extraPanel.querySelectorAll('input, select, textarea');
    for (var i = 0; i < fields.length; i++) {
      fields[i].tabIndex = extraVisible ? 0 : -1;
    }
    toggleExtraBtn.textContent = extraVisible ? '收起' : '展开更多';
  });

  recurringCheck.addEventListener('change', function () {
    if (recurringCheck.checked) {
      trackingCheck.checked = false;
      recurringOptions.classList.add('open');
      dueDateInput.disabled = true;
      dueDateInput.value = '';
      var d = new Date();
      var mm = (d.getMonth() + 1).toString().padStart(2, '0');
      var dd = d.getDate().toString().padStart(2, '0');
      var today = d.getFullYear() + '-' + mm + '-' + dd;
      recurringStart.value = today;
      recurringEnd.value = today;
      updateWeekdayVisibility();
    } else {
      recurringOptions.classList.remove('open');
      dueDateInput.disabled = false;
    }
  });

  repeatTypeRadios.forEach(function (radio) {
    radio.addEventListener('change', updateWeekdayVisibility);
  });

  function getSelectedRepeatType() {
    for (var i = 0; i < repeatTypeRadios.length; i++) {
      if (repeatTypeRadios[i].checked) return repeatTypeRadios[i].value;
    }
    return 'daily';
  }

  function getSelectedWeekdays() {
    var days = [];
    for (var i = 0; i < weekdayChips.length; i++) {
      if (weekdayChips[i].checked) days.push(parseInt(weekdayChips[i].dataset.wd, 10));
    }
    return days.sort(function (a, b) { return a - b; });
  }

  function updateWeekdayVisibility() {
    var type = getSelectedRepeatType();
    weekdayPicker.classList.toggle('open', type === 'weekly');
  }

  trackingCheck.addEventListener('change', function () {
    if (trackingCheck.checked) {
      recurringCheck.checked = false;
      recurringOptions.classList.remove('open');
      dueDateInput.disabled = false;
    }
  });

  // ── Search ───────────────────────────────────────────────────
  searchInput.addEventListener('input', function () {
    searchQuery = searchInput.value.trim();
    render();
  });

  // ── Filters ──────────────────────────────────────────────────
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  // ── Sort ─────────────────────────────────────────────────────
  sortSelect.addEventListener('change', function () {
    saveSort();
    render();
  });

  // ── Date Grouping ──────────────────────────────────────────
  dateGroupToggle.addEventListener('click', function () {
    dateGrouping = !dateGrouping;
    dateGroupToggle.classList.toggle('active', dateGrouping);
    if (dateGrouping) localStorage.removeItem('todoDateGroupCollapsed');
    saveDateGrouping();
    render();
  });

  // ── Compact Done ──────────────────────────────────────────
  compactDoneBtn.addEventListener('click', function () {
    compactDone = !compactDone;
    compactDoneBtn.classList.toggle('active', compactDone);
    saveCompactDone();
    render();
  });

  // ── Clear Completed ──────────────────────────────────────────
  clearCompletedBtn.addEventListener('click', function () {
    var completed = tasks.filter(function (t) { return t.completed; });
    if (completed.length === 0) {
      showToast('没有已完成的任务');
      return;
    }
    confirm('确定要清除所有已完成的任务吗？（' + completed.length + ' 条）').then(function (ok) {
      if (ok) {
        tasks = tasks.filter(function (t) { return !t.completed; });
        saveTasks();
        render();
        renderFolderList();
        showToast('已清除');
      }
    });
  });

  // ── Theme ────────────────────────────────────────────────────
  themeToggle.addEventListener('click', function () {
    document.body.classList.toggle('dark');
    var isDark = document.body.classList.contains('dark');
    themeToggle.textContent = isDark ? '🌙' : '☀️';
    saveTheme();
  });

  themeToggle.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    bgIndex = (bgIndex + 1) % bgImages.length;
    document.body.style.backgroundImage = 'url(\'' + bgImages[bgIndex] + '\')';
    saveBg();
    showToast('背景 ' + (bgIndex + 1) + ' / ' + bgImages.length);
  });

  // ── Help ─────────────────────────────────────────────────────
  var helpPanel = helpOverlay.querySelector('.help-panel');

  function centerHelpPanel() {
    helpPanel.style.marginLeft = '-' + (helpPanel.offsetWidth / 2) + 'px';
    helpPanel.style.marginTop = '-' + (Math.min(helpPanel.offsetHeight, window.innerHeight * 0.85) / 2) + 'px';
  }

  function toggleHelpBlur(visible) {
    document.body.classList.toggle('help-blur', visible);
  }

  helpToggle.addEventListener('click', function () {
    helpOverlay.classList.remove('hidden');
    toggleHelpBlur(true);
    setTimeout(centerHelpPanel, 0);
  });

  window.addEventListener('resize', function () {
    if (!helpOverlay.classList.contains('hidden')) centerHelpPanel();
  });

  helpClose.addEventListener('click', function () {
    helpOverlay.classList.add('hidden');
    toggleHelpBlur(false);
  });

  helpOverlay.addEventListener('click', function (e) {
    if (e.target === helpOverlay) {
      helpOverlay.classList.add('hidden');
      toggleHelpBlur(false);
    }
  });

  // ── Help page navigation ──────────────────────────────────────
  var helpNav = $('#helpNav');
  helpNav.addEventListener('click', function (e) {
    var btn = e.target.closest('.help-nav-btn');
    if (!btn) return;
    var page = btn.dataset.page;
    $$('.help-nav-btn.active').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    $$('.help-page.active').forEach(function (p) { p.classList.remove('active'); });
    var target = helpOverlay.querySelector('.help-page[data-page="' + page + '"]');
    if (target) target.classList.add('active');
    setTimeout(centerHelpPanel, 0);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !helpOverlay.classList.contains('hidden') && !drag) {
      helpOverlay.classList.add('hidden');
      toggleHelpBlur(false);
    }
  });

  // ── Export / Import buttons ──────────────────────────────────
  exportBtn.addEventListener('click', exportData);
  importBtn.addEventListener('click', function () {
    importFile.click();
  });
  importFile.addEventListener('change', function () {
    if (importFile.files[0]) {
      importData(importFile.files[0]);
    }
    importFile.value = '';
  });

  // ── Confirm Dialog ───────────────────────────────────────────
  confirmYes.addEventListener('click', function () {
    var resolve = confirmResolve;
    closeConfirm();
    if (resolve) resolve(true);
  });
  confirmNo.addEventListener('click', function () {
    var resolve = confirmResolve;
    closeConfirm();
    if (resolve) resolve(false);
  });
  confirmDialog.addEventListener('click', function (e) {
    if (e.target === confirmDialog) {
      var resolve = confirmResolve;
      closeConfirm();
      if (resolve) resolve(false);
    }
  });

  // ── Keyboard Shortcuts ───────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    var tag = document.activeElement ? document.activeElement.tagName : '';
    var isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
      e.preventDefault();
      if (helpOverlay.classList.contains('hidden')) {
        helpOverlay.classList.remove('hidden');
        toggleHelpBlur(true);
        setTimeout(centerHelpPanel, 0);
      } else {
        helpOverlay.classList.add('hidden');
        toggleHelpBlur(false);
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 't') {
      e.preventDefault();
      document.body.classList.toggle('dark');
      themeToggle.textContent = document.body.classList.contains('dark') ? '🌙' : '☀️';
      saveTheme();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      bgIndex = (bgIndex + 1) % bgImages.length;
      document.body.style.backgroundImage = 'url(\'' + bgImages[bgIndex] + '\')';
      saveBg();
      showToast('背景 ' + (bgIndex + 1) + ' / ' + bgImages.length);
      return;
    }

    // ── Filter shortcuts ──
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      if (e.key === '1') {
        e.preventDefault();
        document.querySelector('.filter-btn[data-filter="all"]').click();
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        document.querySelector('.filter-btn[data-filter="active"]').click();
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        document.querySelector('.filter-btn[data-filter="completed"]').click();
        return;
      }
    }

    // ── Ctrl+Shift combos ──
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      if (e.key === 'G') {
        e.preventDefault();
        dateGroupToggle.click();
        return;
      }
      if (e.key === 'M') {
        e.preventDefault();
        toggleExtraBtn.click();
        return;
      }
      if (e.key === 'C') {
        e.preventDefault();
        compactDoneBtn.click();
        return;
      }
      if (e.key === 'Delete') {
        e.preventDefault();
        clearCompletedBtn.click();
        return;
      }
    }

    if (e.key === 'Escape') {
      if (drag) return;
      if (isInput) return;
      var editing = taskList.querySelector('.task-item.editing');
      if (editing) {
        render();
        return;
      }
      searchInput.value = '';
      searchQuery = '';
      searchInput.blur();
      render();
      return;
    }

    if (!isInput && e.key === 'n') {
      e.preventDefault();
      titleInput.focus();
    }
  });

  // ── Folder Events ──────────────────────────────────────────
  folderBar.addEventListener('click', function (e) {
    var tab = e.target.closest('.folder-tab');
    if (!tab) return;
    activeFolder = tab.dataset.folder;
    updateFolderTabs();
    render();
    renderFolderList();
  });

  folderBar.addEventListener('contextmenu', function (e) {
    var tab = e.target.closest('.folder-tab');
    if (!tab || tab.dataset.folder === '__all__' || tab.dataset.folder === '__none__' || tab.dataset.folder === '__recurring__') return;
    e.preventDefault();
    showFolderContextMenu(e.clientX, e.clientY, tab.dataset.folder);
  });

  addFolderBtn.addEventListener('click', function () {
    showFolderInput();
  });

  folderConfirm.addEventListener('click', function () {
    commitFolderInput();
  });

  folderCancel.addEventListener('click', function () {
    hideFolderInput();
  });

  folderNameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') commitFolderInput();
    if (e.key === 'Escape') hideFolderInput();
  });

  contextMenu.addEventListener('click', function (e) {
    var action = e.target.dataset.action;
    var folderId = contextMenu.dataset.folderId;
    var taskId = contextMenu.dataset.taskId;
    if (action === 'rename-folder') {
      hideContextMenu();
      showFolderInput(folderId);
    } else if (action === 'delete-folder') {
      hideContextMenu();
      var folder = getFolderById(folderId);
      var taskCount = getFolderTaskCount(folderId);
      var msg = '确定要删除文件夹 "' + folder.name + '" 吗？';
      if (taskCount > 0) msg += '\n其中的 ' + taskCount + ' 个任务将变为未分类。';
      confirm(msg).then(function (ok) {
        if (ok) {
          deleteFolder(folderId);
          renderFolderList();
          updateFolderSelect();
          render();
          showToast('文件夹已删除');
        }
      });
    }
  });

  // Subtask actions
  taskList.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-task-id]');
    if (!btn) return;
    var taskId = btn.dataset.taskId;
    var subId = btn.dataset.subtaskId;
    var action = btn.dataset.action;

    if (action === 'subtask-toggle') {
      toggleSubtask(taskId, subId);
      render();
    } else if (action === 'subtask-delete') {
      deleteSubtask(taskId, subId);
      render();
    } else if (action === 'subtask-add') {
      var section = btn.closest('.subtask-section');
      if (!section) return;
      var input = section.querySelector('.subtask-add-input');
      var dur = section.querySelector('.subtask-add-dur');
      var title = input.value.trim();
      if (!title) { showToast('请输入子任务标题'); return; }
      var est = dur.value ? parseInt(dur.value, 10) : 0;
      if (!addSubtask(taskId, title, est)) {
        showToast('子任务时长超出总任务时长');
        return;
      }
      render();
    } else if (action === 'toggle-subtasks') {
      var card = btn.closest('.task-item');
      if (!card) return;
      var list = card.querySelector('.subtask-list');
      if (!list) return;
      var isHidden = list.style.display === 'none';
      list.style.display = isHidden ? '' : 'none';
      var task = tasks.find(function (t) { return t.id === taskId; });
      var subCount = task ? (task.subtasks || []).length : 0;
      var done = task ? (task.subtasks || []).filter(function (s) { return s.completed; }).length : 0;
      btn.textContent = isHidden ? '▾ 子任务（' + done + '/' + subCount + ' 已完成）' : '▸ 子任务（' + done + '/' + subCount + ' 已完成）';
      if (subCount === 0) btn.textContent = isHidden ? '▾ 子任务' : '▸ 子任务';
    }
  });

  document.addEventListener('click', function (e) {
    if (!contextMenu.contains(e.target)) {
      hideContextMenu();
    }
    if (!folderInputRow.contains(e.target) && e.target !== addFolderBtn && !contextMenu.contains(e.target)) {
      hideFolderInput();
    }
  });

  // ── Init ─────────────────────────────────────────────────────
  loadTasks();
  loadFolders();
  loadRecurring();
  loadTrackingRules();
  loadTheme();
  loadBg();
  loadSort();
  loadDateGrouping();
  loadCompactDone();
  generateDailyTasks();
  var initFields = extraPanel.querySelectorAll('input, select, textarea');
  for (var fi = 0; fi < initFields.length; fi++) {
    initFields[fi].tabIndex = -1;
  }
  renderFolderList();
  updateFolderSelect();
  render();
})();
