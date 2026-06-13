/**
 * ============================================================
 *  Life Dashboard — js/app.js
 *  Stack  : Vanilla JavaScript ES6+
 *  Storage: localStorage (no backend)
 *  Modules (IIFE pattern):
 *    1. ThemeManager       — Light/Dark toggle + persistence
 *    2. GreetingManager    — Real-time clock, date, greeting
 *    3. NameManager        — Custom user name + modal
 *    4. TimerManager       — Pomodoro 25-min countdown
 *    5. TodoManager        — CRUD tasks + duplicate guard
 *    6. LinksManager       — Quick links CRUD
 *    7. App.init()         — Bootstrap all modules
 * ============================================================
 */

'use strict';

/* ============================================================
   CONSTANTS — localStorage keys & config
============================================================ */
const STORAGE_KEYS = {
  THEME : 'ld_theme',
  NAME  : 'ld_username',
  TODOS : 'ld_todos',
  LINKS : 'ld_links',
};

const POMODORO_SECONDS = 25 * 60; // 25 minutes

/* ============================================================
   UTILITY HELPERS
============================================================ */

/**
 * Retrieves and JSON-parses a value from localStorage.
 * Returns `fallback` if the key is missing or parse fails.
 */
function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * JSON-stringifies a value and saves it to localStorage.
 */
function storageSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Shows a warning element and auto-hides it after `ms` milliseconds.
 * Clears any running timer first to avoid stacking.
 */
const _warningTimers = {};
function showWarning(element, ms = 3000) {
  if (!element) return;
  element.classList.remove('hidden');
  clearTimeout(_warningTimers[element.id]);
  _warningTimers[element.id] = setTimeout(
    () => element.classList.add('hidden'),
    ms
  );
}

/**
 * Pads a number to 2 digits: 5 → "05".
 */
const pad = (n) => String(n).padStart(2, '0');

/* ============================================================
   1. THEME MANAGER
   Responsibility: toggle light/dark, persist preference
============================================================ */
const ThemeManager = (() => {
  const btnTheme  = document.getElementById('btn-theme');
  const themeIcon = document.getElementById('theme-icon');
  const html      = document.documentElement;

  /** Applies a theme visually and updates the toggle icon. */
  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  /** Reads saved preference and applies on load. */
  function init() {
    const saved = storageGet(STORAGE_KEYS.THEME, 'light');
    applyTheme(saved);

    btnTheme.addEventListener('click', () => {
      const current = html.getAttribute('data-theme');
      const next    = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      storageSet(STORAGE_KEYS.THEME, next);
    });
  }

  return { init };
})();

/* ============================================================
   2. GREETING MANAGER
   Responsibility: real-time HH:MM:SS clock, date display,
                   contextual time-of-day greeting
============================================================ */
const GreetingManager = (() => {
  const clockEl    = document.getElementById('clock');
  const dateEl     = document.getElementById('date-display');
  const greetingEl = document.getElementById('greeting-text');
  const footerYear = document.getElementById('footer-year');

  /** Returns greeting string based on current hour. */
  function getGreeting(hour) {
    if (hour >= 5  && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  }

  /** Ticks every second — updates clock and greeting. */
  function tick() {
    const now  = new Date();
    const h    = now.getHours();
    const m    = now.getMinutes();
    const s    = now.getSeconds();

    clockEl.textContent    = `${pad(h)}:${pad(m)}:${pad(s)}`;
    greetingEl.textContent = getGreeting(h);
  }

  /** Renders the current date once (e.g., "Saturday, 13 June 2026"). */
  function renderDate() {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-GB', {
      weekday: 'long',
      year   : 'numeric',
      month  : 'long',
      day    : 'numeric',
    });
    footerYear.textContent = now.getFullYear();
  }

  function init() {
    renderDate();
    tick();                      // immediate first render
    setInterval(tick, 1000);     // then every second
  }

  return { init };
})();

/* ============================================================
   3. NAME MANAGER
   Responsibility: store/display a custom user name,
                   modal for input
============================================================ */
const NameManager = (() => {
  const usernameDisplay = document.getElementById('username-display');
  const btnEditName     = document.getElementById('btn-edit-name');
  const nameModal       = document.getElementById('name-modal');
  const inputUsername   = document.getElementById('input-username');
  const btnSaveName     = document.getElementById('btn-save-name');
  const btnCancelName   = document.getElementById('btn-cancel-name');

  /** Updates the DOM badge showing the stored name. */
  function renderName() {
    const name = storageGet(STORAGE_KEYS.NAME, '');
    usernameDisplay.textContent = name ? `${name}!` : '';
  }

  function openModal() {
    const name = storageGet(STORAGE_KEYS.NAME, '');
    inputUsername.value = name;
    nameModal.classList.remove('hidden');
    setTimeout(() => inputUsername.focus(), 50);
  }

  function closeModal() {
    nameModal.classList.add('hidden');
  }

  function saveName() {
    const name = inputUsername.value.trim();
    storageSet(STORAGE_KEYS.NAME, name);
    renderName();
    closeModal();
  }

  function init() {
    renderName();

    // Show modal on first load if name is not set
    if (!storageGet(STORAGE_KEYS.NAME, '')) {
      openModal();
    }

    btnEditName.addEventListener('click', openModal);
    usernameDisplay.addEventListener('click', openModal);
    btnSaveName.addEventListener('click', saveName);
    btnCancelName.addEventListener('click', closeModal);

    // Save on Enter key
    inputUsername.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveName();
      if (e.key === 'Escape') closeModal();
    });

    // Close modal on backdrop click
    nameModal.addEventListener('click', (e) => {
      if (e.target === nameModal) closeModal();
    });
  }

  return { init };
})();

/* ============================================================
   4. TIMER MANAGER
   Responsibility: Pomodoro 25-min countdown with
                   Start / Stop / Reset controls
============================================================ */
const TimerManager = (() => {
  const timerDisplay = document.getElementById('timer-display');
  const timerStatus  = document.getElementById('timer-status');
  const btnStart     = document.getElementById('btn-start');
  const btnStop      = document.getElementById('btn-stop');
  const btnReset     = document.getElementById('btn-reset');

  let secondsLeft  = POMODORO_SECONDS;
  let intervalId   = null;
  let isRunning    = false;

  /** Converts seconds to MM:SS string and pushes to DOM. */
  function render() {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    timerDisplay.textContent = `${pad(m)}:${pad(s)}`;
  }

  /** Called every 1 second when timer is active. */
  function tick() {
    if (secondsLeft <= 0) {
      clearInterval(intervalId);
      isRunning = false;
      timerDisplay.classList.remove('running');
      timerStatus.textContent = '🎉 Session complete! Take a break.';
      render();
      return;
    }
    secondsLeft--;
    render();
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    intervalId = setInterval(tick, 1000);
    timerDisplay.classList.add('running');
    timerStatus.textContent = '⏱ Focusing… stay in the zone!';
  }

  function stop() {
    if (!isRunning) return;
    clearInterval(intervalId);
    isRunning = false;
    timerDisplay.classList.remove('running');
    timerStatus.textContent = '⏸ Timer paused. Resume when ready.';
  }

  function reset() {
    clearInterval(intervalId);
    isRunning    = false;
    secondsLeft  = POMODORO_SECONDS;
    timerDisplay.classList.remove('running');
    timerStatus.textContent = 'Ready to focus!';
    render();
  }

  function init() {
    render(); // show 25:00 immediately

    btnStart.addEventListener('click', start);
    btnStop.addEventListener('click',  stop);
    btnReset.addEventListener('click', reset);
  }

  return { init };
})();

/* ============================================================
   5. TODO MANAGER
   Responsibility: Add / Edit / Complete / Delete tasks
                   + duplicate prevention + localStorage sync
============================================================ */
const TodoManager = (() => {
  const inputTask   = document.getElementById('input-task');
  const btnAddTask  = document.getElementById('btn-add-task');
  const taskList    = document.getElementById('task-list');
  const todoWarning = document.getElementById('todo-warning');
  const todoEmpty   = document.getElementById('todo-empty');

  // Edit modal elements
  const editModal       = document.getElementById('edit-modal');
  const inputEditTask   = document.getElementById('input-edit-task');
  const editWarning     = document.getElementById('edit-warning');
  const btnSaveEdit     = document.getElementById('btn-save-edit');
  const btnCancelEdit   = document.getElementById('btn-cancel-edit');

  /** In-memory task array. Shape: { id, text, done } */
  let tasks = [];
  let editingId = null; // id of task currently being edited

  /* ── Storage helpers ── */
  function loadTasks() {
    tasks = storageGet(STORAGE_KEYS.TODOS, []);
  }
  function saveTasks() {
    storageSet(STORAGE_KEYS.TODOS, tasks);
  }

  /* ── Duplicate check (case-insensitive trim) ── */
  function isDuplicate(text, excludeId = null) {
    const normalized = text.trim().toLowerCase();
    return tasks.some(
      (t) => t.text.trim().toLowerCase() === normalized && t.id !== excludeId
    );
  }

  /* ── Render all tasks to the DOM ── */
  function render() {
    taskList.innerHTML = '';

    if (tasks.length === 0) {
      todoEmpty.classList.remove('hidden');
      return;
    }
    todoEmpty.classList.add('hidden');

    tasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = `task-item${task.done ? ' done' : ''}`;
      li.dataset.id = task.id;

      // Checkbox
      const checkbox = document.createElement('input');
      checkbox.type      = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked   = task.done;
      checkbox.setAttribute('aria-label', `Mark "${task.text}" as done`);
      checkbox.addEventListener('change', () => toggleDone(task.id));

      // Label
      const label = document.createElement('span');
      label.className   = 'task-label';
      label.textContent = task.text;
      label.title       = 'Double-click to edit';
      label.addEventListener('dblclick', () => openEditModal(task.id));

      // Action buttons
      const actions = document.createElement('div');
      actions.className = 'task-actions';

      const editBtn = document.createElement('button');
      editBtn.className   = 'btn-icon';
      editBtn.textContent = '✏️';
      editBtn.title       = 'Edit task';
      editBtn.setAttribute('aria-label', `Edit task: ${task.text}`);
      editBtn.addEventListener('click', () => openEditModal(task.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.className   = 'btn-danger';
      deleteBtn.textContent = '🗑';
      deleteBtn.title       = 'Delete task';
      deleteBtn.setAttribute('aria-label', `Delete task: ${task.text}`);
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      actions.append(editBtn, deleteBtn);
      li.append(checkbox, label, actions);
      taskList.appendChild(li);
    });
  }

  /* ── CRUD Operations ── */

  /** Adds a new task after passing validation. */
  function addTask() {
    const text = inputTask.value.trim();
    if (!text) return;

    // Duplicate guard — Challenge Feature #3
    if (isDuplicate(text)) {
      showWarning(todoWarning);
      inputTask.select();
      return;
    }

    tasks.push({ id: Date.now(), text, done: false });
    saveTasks();
    render();

    inputTask.value = '';
    inputTask.focus();
    todoWarning.classList.add('hidden');
  }

  /** Toggles the done/completed state of a task. */
  function toggleDone(id) {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.done = !task.done;
      saveTasks();
      render();
    }
  }

  /** Removes a task permanently. */
  function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
  }

  /* ── Edit Modal ── */

  function openEditModal(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    editingId              = id;
    inputEditTask.value    = task.text;
    editWarning.classList.add('hidden');
    editModal.classList.remove('hidden');
    setTimeout(() => inputEditTask.focus(), 50);
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
    editingId = null;
  }

  function saveEdit() {
    const newText = inputEditTask.value.trim();
    if (!newText) return;

    // Duplicate guard for editing
    if (isDuplicate(newText, editingId)) {
      showWarning(editWarning);
      return;
    }

    const task = tasks.find((t) => t.id === editingId);
    if (task) {
      task.text = newText;
      saveTasks();
      render();
    }
    closeEditModal();
  }

  /* ── Init ── */
  function init() {
    loadTasks();
    render();

    // Add task
    btnAddTask.addEventListener('click', addTask);
    inputTask.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addTask();
    });

    // Edit modal controls
    btnSaveEdit.addEventListener('click', saveEdit);
    btnCancelEdit.addEventListener('click', closeEditModal);
    inputEditTask.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  saveEdit();
      if (e.key === 'Escape') closeEditModal();
    });

    // Close edit modal on backdrop click
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }

  return { init };
})();

/* ============================================================
   6. LINKS MANAGER
   Responsibility: Add / Delete quick-launch links,
                   persist to localStorage
============================================================ */
const LinksManager = (() => {
  const inputLinkName  = document.getElementById('input-link-name');
  const inputLinkUrl   = document.getElementById('input-link-url');
  const btnAddLink     = document.getElementById('btn-add-link');
  const linksGrid      = document.getElementById('links-grid');
  const linksWarning   = document.getElementById('links-warning');
  const linksEmpty     = document.getElementById('links-empty');

  /** In-memory links array. Shape: { id, name, url } */
  let links = [];

  /* ── Storage helpers ── */
  function loadLinks() {
    links = storageGet(STORAGE_KEYS.LINKS, []);
  }
  function saveLinks() {
    storageSet(STORAGE_KEYS.LINKS, links);
  }

  /**
   * Basic URL validation — must start with http:// or https://
   * or we auto-prepend https://.
   */
  function normalizeUrl(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  }

  /* ── Render ── */
  function render() {
    linksGrid.innerHTML = '';

    if (links.length === 0) {
      linksEmpty.classList.remove('hidden');
      return;
    }
    linksEmpty.classList.add('hidden');

    links.forEach((link) => {
      // Anchor opens in new tab
      const anchor = document.createElement('a');
      anchor.className          = 'link-item';
      anchor.href               = link.url;
      anchor.target             = '_blank';
      anchor.rel                = 'noopener noreferrer';
      anchor.setAttribute('aria-label', `Open ${link.name}`);

      const nameSpan = document.createElement('span');
      nameSpan.textContent = link.name;

      // Delete button (stops propagation so it doesn't open the link)
      const deleteBtn = document.createElement('button');
      deleteBtn.className         = 'link-delete-btn';
      deleteBtn.textContent       = '✕';
      deleteBtn.title             = `Remove ${link.name}`;
      deleteBtn.setAttribute('aria-label', `Remove link: ${link.name}`);
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteLink(link.id);
      });

      anchor.append(nameSpan, deleteBtn);
      linksGrid.appendChild(anchor);
    });
  }

  /* ── CRUD ── */

  function addLink() {
    const name = inputLinkName.value.trim();
    const url  = normalizeUrl(inputLinkUrl.value);

    // Validate both fields
    if (!name || !url) {
      showWarning(linksWarning);
      return;
    }

    links.push({ id: Date.now(), name, url });
    saveLinks();
    render();

    inputLinkName.value = '';
    inputLinkUrl.value  = '';
    inputLinkName.focus();
    linksWarning.classList.add('hidden');
  }

  function deleteLink(id) {
    links = links.filter((l) => l.id !== id);
    saveLinks();
    render();
  }

  /* ── Init ── */
  function init() {
    loadLinks();
    render();

    btnAddLink.addEventListener('click', addLink);

    // Allow pressing Enter in either input field to add link
    [inputLinkName, inputLinkUrl].forEach((el) => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addLink();
      });
    });
  }

  return { init };
})();

/* ============================================================
   7. APP — Bootstrap: initialise all modules in order
============================================================ */
const App = {
  init() {
    ThemeManager.init();    // Apply saved theme first (prevents FOUC)
    GreetingManager.init(); // Start clock ticking
    NameManager.init();     // Load/prompt username
    TimerManager.init();    // Wire up Pomodoro controls
    TodoManager.init();     // Load tasks, bind events
    LinksManager.init();    // Load links, bind events
  },
};

// Run once the DOM is fully parsed
document.addEventListener('DOMContentLoaded', () => App.init());
