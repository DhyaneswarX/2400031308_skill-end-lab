// File: /my-notes-app/my-notes-app/src/js/app.js

document.addEventListener('DOMContentLoaded', () => {
  const notesList = document.getElementById('notes-list');
  const noteInput = document.getElementById('note-input');
  const addNoteButton = document.getElementById('add-note');

  function displayNotes() {
    notesList.innerHTML = '';
    const notes = Storage.getNotes();
    notes.forEach((note, index) => {
      const noteItem = document.createElement('div');
      noteItem.className = 'note';
      const title = document.createElement('h2');
      title.textContent = `Note ${index + 1}`;
      const p = document.createElement('p');
      p.textContent = note;
      const controls = document.createElement('div');
      controls.className = 'controls';
      const editBtn = createEditButton(index);
      const delBtn = createDeleteButton(index);
      controls.appendChild(editBtn);
      controls.appendChild(delBtn);
      noteItem.appendChild(title);
      noteItem.appendChild(p);
      noteItem.appendChild(controls);
      notesList.appendChild(noteItem);
    });
  }

  function createEditButton(index) {
    const editButton = document.createElement('button');
    editButton.className = 'edit-button';
    editButton.textContent = 'Edit';
    editButton.onclick = () => {
      noteInput.value = Storage.getNotes()[index];
      Storage.deleteNote(index);
      displayNotes();
    };
    return editButton;
  }

  function createDeleteButton(index) {
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => {
      Storage.deleteNote(index);
      displayNotes();
    };
    return deleteButton;
  }

  addNoteButton.onclick = () => {
    const noteText = noteInput.value.trim();
    if (noteText) {
      Storage.addNote(noteText);
      noteInput.value = '';
      displayNotes();
    }
  };

  displayNotes();
});