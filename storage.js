const Storage = {
  addNote(note) {
    const notes = this.getNotes();
    notes.push(note);
    localStorage.setItem('notes', JSON.stringify(notes));
  },
  getNotes() {
    const notes = localStorage.getItem('notes');
    return notes ? JSON.parse(notes) : [];
  },
  deleteNote(index) {
    const notes = this.getNotes();
    notes.splice(index, 1);
    localStorage.setItem('notes', JSON.stringify(notes));
  }
};

window.Storage = Storage;