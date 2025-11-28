// Notes App - Vanilla JS
// Persistence via localStorage, features: CRUD, search, tags, pin, archive, trash, import/export, colors, autosave, shortcuts

const STORAGE_KEY = 'trae_notes_v1';

// State
let notes = [];
let selectedId = null;
let filters = { search: '', tag: '', status: 'active', sort: 'updated-desc', pinnedFirst: true };
let autosaveTimer = null;

// Elements
const el = {
  themeToggle: document.getElementById('themeToggle'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  searchInput: document.getElementById('searchInput'),
  tagFilter: document.getElementById('tagFilter'),
  statusFilter: document.getElementById('statusFilter'),
  sortOrder: document.getElementById('sortOrder'),
  showPinnedFirst: document.getElementById('showPinnedFirst'),
  newNoteBtn: document.getElementById('newNoteBtn'),
  notesList: document.getElementById('notesList'),
  noteTitle: document.getElementById('noteTitle'),
  noteContent: document.getElementById('noteContent'),
  noteColor: document.getElementById('noteColor'),
  tagInput: document.getElementById('tagInput'),
  tagsContainer: document.getElementById('tagsContainer'),
  clearTagsBtn: document.getElementById('clearTagsBtn'),
  pinToggle: document.getElementById('pinToggle'),
  archiveToggle: document.getElementById('archiveToggle'),
  saveBtn: document.getElementById('saveBtn'),
  deleteBtn: document.getElementById('deleteBtn'),
  restoreBtn: document.getElementById('restoreBtn'),
  purgeBtn: document.getElementById('purgeBtn'),
  saveStatus: document.getElementById('saveStatus'),
};

// Utils
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => new Date().toISOString();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    notes = raw ? JSON.parse(raw) : [];
  } catch (e) {
    notes = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  setStatus('Saved');
}

function setStatus(text) {
  el.saveStatus.textContent = text;
}

function sanitize(str) {
  return (str || '').toString();
}

// CRUD
function createNote() {
  const note = {
    id: uid(),
    title: 'Untitled',
    content: '',
    tags: [],
    color: '#ffd966',
    pinned: false,
    archived: false,
    deleted: false,
    createdAt: now(),
    updatedAt: now(),
  };
  notes.unshift(note);
  save();
  selectNote(note.id);
  render();
}

function updateNote(id, patch) {
  const idx = notes.findIndex(n => n.id === id);
  if (idx === -1) return;
  notes[idx] = { ...notes[idx], ...patch, updatedAt: now() };
  scheduleAutosave();
  renderList();
}

function deleteNote(id) {
  updateNote(id, { deleted: true });
  setStatus('Moved to trash');
  renderEditor();
}

function purgeNote(id) {
  notes = notes.filter(n => n.id !== id);
  if (selectedId === id) selectedId = null;
  save();
  render();
}

function restoreNote(id) {
  updateNote(id, { deleted: false });
  setStatus('Restored');
}

function selectNote(id) {
  selectedId = id;
  renderEditor();
  renderList();
}

// Filters & Sorting
function getFilteredNotes() {
  let list = notes.slice();

  // Status
  if (filters.status === 'active') {
    list = list.filter(n => !n.archived && !n.deleted);
  } else if (filters.status === 'archived') {
    list = list.filter(n => n.archived && !n.deleted);
  } else if (filters.status === 'trash') {
    list = list.filter(n => n.deleted);
  }

  // Tag
  if (filters.tag) list = list.filter(n => n.tags.includes(filters.tag));

  // Search
  const q = filters.search.trim().toLowerCase();
  if (q) list = list.filter(n => (n.title + ' ' + n.content).toLowerCase().includes(q));

  // Sort
  list.sort((a, b) => {
    if (filters.pinnedFirst && a.pinned !== b.pinned) return b.pinned - a.pinned;
    switch (filters.sort) {
      case 'updated-asc':
        return new Date(a.updatedAt) - new Date(b.updatedAt);
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      case 'updated-desc':
      default:
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    }
  });

  return list;
}

// Rendering
function renderTagFilterOptions() {
  const tags = Array.from(new Set(notes.flatMap(n => n.tags))).sort();
  el.tagFilter.innerHTML = '<option value="">All tags</option>' + tags.map(t => `<option value="${t}">${t}</option>`).join('');
  if (filters.tag) el.tagFilter.value = filters.tag;
}

function renderList() {
  renderTagFilterOptions();
  const list = getFilteredNotes();
  el.notesList.innerHTML = '';
  list.forEach(n => {
    const li = document.createElement('li');
    li.className = 'list-group-item note-item';
    li.dataset.id = n.id;

    const sw = document.createElement('span');
    sw.className = 'note-swatch';
    sw.style.background = n.color;

    const title = document.createElement('div');
    title.className = 'note-title fw-semibold';
    title.textContent = n.title || 'Untitled';

    const meta = document.createElement('div');
    meta.className = 'note-meta';
    const updated = new Date(n.updatedAt).toLocaleString();
    meta.textContent = `${n.pinned ? '📌 ' : ''}${n.archived ? '📦 ' : ''}${n.deleted ? '🗑️ ' : ''}Updated ${updated}`;

    li.append(sw, title, meta);
    li.addEventListener('click', () => selectNote(n.id));
    el.notesList.appendChild(li);
  });
}

function renderEditor() {
  const n = notes.find(n => n.id === selectedId);
  const isTrash = n?.deleted;
  el.restoreBtn.classList.toggle('d-none', !isTrash);
  el.purgeBtn.classList.toggle('d-none', !isTrash);

  if (!n) {
    el.noteTitle.value = '';
    el.noteContent.value = '';
    el.noteColor.value = '#ffd966';
    el.pinToggle.checked = false;
    el.archiveToggle.checked = false;
    el.tagsContainer.innerHTML = '';
    return;
  }

  el.noteTitle.value = n.title;
  el.noteContent.value = n.content;
  el.noteColor.value = n.color || '#ffd966';
  el.pinToggle.checked = !!n.pinned;
  el.archiveToggle.checked = !!n.archived;
  renderTags(n.tags);
}

function renderTags(tags) {
  el.tagsContainer.innerHTML = '';
  tags.forEach(t => {
    const pill = document.createElement('span');
    pill.className = 'tag-pill';
    pill.innerHTML = `<span>${t}</span>`;
    const btn = document.createElement('button');
    btn.innerHTML = '<i class="bi bi-x"></i>';
    btn.addEventListener('click', () => removeTag(t));
    pill.appendChild(btn);
    el.tagsContainer.appendChild(pill);
  });
}

// Events
function scheduleAutosave() {
  setStatus('Editing…');
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    save();
  }, 500);
}

el.newNoteBtn.addEventListener('click', createNote);
el.saveBtn.addEventListener('click', () => { save(); });
el.deleteBtn.addEventListener('click', () => { if (selectedId) deleteNote(selectedId); });
el.restoreBtn.addEventListener('click', () => { if (selectedId) restoreNote(selectedId); });
el.purgeBtn.addEventListener('click', () => { if (selectedId) purgeNote(selectedId); });

el.noteTitle.addEventListener('input', (e) => { if (!selectedId) return; updateNote(selectedId, { title: sanitize(e.target.value) }); });
el.noteContent.addEventListener('input', (e) => { if (!selectedId) return; updateNote(selectedId, { content: sanitize(e.target.value) }); });
el.noteColor.addEventListener('input', (e) => { if (!selectedId) return; updateNote(selectedId, { color: e.target.value }); });
el.pinToggle.addEventListener('change', (e) => { if (!selectedId) return; updateNote(selectedId, { pinned: e.target.checked }); });
el.archiveToggle.addEventListener('change', (e) => { if (!selectedId) return; updateNote(selectedId, { archived: e.target.checked }); });

el.searchInput.addEventListener('input', (e) => { filters.search = e.target.value; renderList(); });
el.tagFilter.addEventListener('change', (e) => { filters.tag = e.target.value; renderList(); });
el.statusFilter.addEventListener('change', (e) => { filters.status = e.target.value; renderList(); });
el.sortOrder.addEventListener('change', (e) => { filters.sort = e.target.value; renderList(); });
el.showPinnedFirst.addEventListener('change', (e) => { filters.pinnedFirst = e.target.checked; renderList(); });

// Tags
function addTag(tag) {
  if (!selectedId) return;
  tag = sanitize(tag).trim();
  if (!tag) return;
  const n = notes.find(n => n.id === selectedId);
  if (!n.tags.includes(tag)) {
    updateNote(selectedId, { tags: [...n.tags, tag] });
    renderEditor();
  }
}

function removeTag(tag) {
  if (!selectedId) return;
  const n = notes.find(n => n.id === selectedId);
  updateNote(selectedId, { tags: n.tags.filter(t => t !== tag) });
  renderEditor();
}

el.tagInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { addTag(e.target.value); e.target.value = ''; }
});

el.clearTagsBtn.addEventListener('click', () => {
  if (!selectedId) return;
  updateNote(selectedId, { tags: [] });
  renderEditor();
});

// Import/Export
el.exportBtn.addEventListener('click', () => {
  const data = JSON.stringify(notes, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notes-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

el.importInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      notes = data.map(n => ({
        id: n.id || uid(),
        title: sanitize(n.title),
        content: sanitize(n.content),
        tags: Array.isArray(n.tags) ? n.tags : [],
        color: n.color || '#ffd966',
        pinned: !!n.pinned,
        archived: !!n.archived,
        deleted: !!n.deleted,
        createdAt: n.createdAt || now(),
        updatedAt: n.updatedAt || now(),
      }));
      selectedId = notes[0]?.id || null;
      save();
      render();
      setStatus('Imported');
    } else {
      alert('Invalid JSON format');
    }
  } catch (err) {
    console.error(err);
    alert('Failed to import JSON');
  } finally {
    e.target.value = '';
  }
});

// Theme
el.themeToggle.addEventListener('click', () => {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
});

// Shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    save();
  }
  if (e.key === 'Escape') {
    selectedId = null;
    renderEditor();
  }
});

// Init
function render() {
  renderList();
  renderEditor();
}

load();
if (notes.length === 0) {
  // Seed an example note
  notes = [{
    id: uid(),
    title: 'Welcome to Notes',
    content: 'This is your first note.\n\n- Create new notes\n- Add tags\n- Pin, archive, or delete\n- Import/export JSON\n- Autosave while typing',
    tags: ['getting-started'],
    color: '#ffd966',
    pinned: true,
    archived: false,
    deleted: false,
    createdAt: now(),
    updatedAt: now(),
  }];
  selectedId = notes[0].id;
  save();
} else {
  selectedId = notes[0]?.id || null;
}

render();
