import React, { useState, useEffect } from 'react';
import './Notes.css';
import { NotesService } from '../../../services/notesService';
import type { Note } from '../../../services/notesService';

interface NotesProps {
  // No props needed since we use external CSS
}

const Notes: React.FC<NotesProps> = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showDeleteNoteModal, setShowDeleteNoteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const noteEditorRef = React.useRef<HTMLTextAreaElement>(null);

  // Load notes from server API on component mount
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        console.log('Loading notes from service layer');
        const data = await NotesService.getNotes();
        setNotes(data);
        console.log('Notes loaded:', data);
      } catch (error) {
        console.error('Error loading notes from service:', error);
      }
    };

    fetchNotes();
  }, []);

  // Notes functionality
  const createNote = async () => {
    try {
      const newNote = await NotesService.createNote('', '');
      setNotes(prev => [newNote, ...prev]);
      setEditingNote(newNote);
      setShowNoteModal(true);
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const updateNote = async (id: string, updates: { title?: string; content?: string }) => {
    try {
      const updatedNote = await NotesService.updateNote(id, updates);
      setNotes(prev => prev.map(note => 
        note.id === id ? updatedNote : note
      ));
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const closeNoteModal = () => {
    setShowNoteModal(false);
    setEditingNote(null);
  };

  const deleteNote = async (id: string) => {
    try {
      await NotesService.deleteNote(id);
      setNotes(prev => prev.filter(note => note.id !== id));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const confirmDeleteNote = (id: string) => {
    setNoteToDelete(id);
    setShowDeleteNoteModal(true);
  };

  const handleDeleteNote = async () => {
    if (noteToDelete) {
      await deleteNote(noteToDelete);
      setShowDeleteNoteModal(false);
      setNoteToDelete(null);
    }
  };

  const cancelDeleteNote = () => {
    setShowDeleteNoteModal(false);
    setNoteToDelete(null);
  };

  const formatNoteDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <>
      <div className="notes-container">
      <div className="notes-header">
        <h3 className="notes-title">Your Notes</h3>
        <button
          className="notes-create-button"
          onClick={createNote}
        >
          Create Note
        </button>
      </div>

      {/* Notes Grid */}
      {notes.length === 0 ? (
        <div className="notes-empty-state">
          <h3 className="notes-empty-title">No notes yet</h3>
          <p className="notes-empty-text">
            Create your first note to start capturing your ideas
          </p>
          <p className="notes-empty-subtext">
            Write down thoughts, ideas, and inspiration for your creative projects
          </p>
        </div>
      ) : (
        <div className="notes-list">
          {notes.map((note) => (
            <div 
              key={note.id} 
              className="note-item"
              onClick={() => {
                setEditingNote(note);
                setShowNoteModal(true);
              }}
              onMouseEnter={(e) => {
                const deleteButton = e.currentTarget.querySelector('button');
                if (deleteButton) {
                  deleteButton.style.opacity = "1";
                }
              }}
              onMouseLeave={(e) => {
                const deleteButton = e.currentTarget.querySelector('button');
                if (deleteButton) {
                  deleteButton.style.opacity = "0";
                }
              }}
            >
              <div className="note-content">
                <div className="note-text">
                  <h4 className="note-title">
                    {note.title}
                  </h4>
                  <p className="note-preview">
                    {note.content || 'No content yet...'}
                  </p>
                </div>
                <div className="note-meta">
                  <span className="note-date">
                    {formatNoteDate(note.updated_at)}
                  </span>
                  <button
                    className="note-delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDeleteNote(note.id);
                    }}
                    title="Delete note"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && editingNote && (
        <div className="note-modal-overlay">
          <div className="note-modal">
            <div className="note-modal-header">
              <h3 className="note-modal-title">
                {editingNote.title ? 'Edit Note' : 'New Note'}
              </h3>
              <button
                className="note-modal-close"
                onClick={closeNoteModal}
                title="Close note"
              >
                ×
              </button>
            </div>
            
            <input
              type="text"
              className="note-title-input"
              placeholder="Note title..."
              value={editingNote.title}
              onChange={(e) => {
                const newTitle = e.target.value;
                setEditingNote(prev => prev ? { ...prev, title: newTitle } : null);
                updateNote(editingNote.id, { title: newTitle });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  closeNoteModal();
                }
              }}
              autoFocus
            />
            
            {/* Note Editor */}
            <textarea
              ref={noteEditorRef}
              className="note-content-textarea"
              value={editingNote.content}
              onChange={(e) => {
                const newContent = e.target.value;
                setEditingNote(prev => prev ? { ...prev, content: newContent } : null);
                updateNote(editingNote.id, { content: newContent });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  closeNoteModal();
                }
              }}
              placeholder="Write your note here..."
            />
            
            <div className="note-auto-save">
              Auto-saved as you type
            </div>
          </div>
        </div>
      )}

      {/* Delete Note Confirmation Modal */}
      {showDeleteNoteModal && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            {/* Title */}
            <h3 className="delete-modal-title">
              Delete Note
            </h3>

            {/* Description */}
            <p className="delete-modal-description">
              This action cannot be undone. The note will be permanently deleted from your collection.
            </p>

            {/* Buttons */}
            <div className="delete-modal-buttons">
              <button
                className="delete-modal-cancel-btn"
                onClick={cancelDeleteNote}
              >
                Cancel
              </button>
              <button
                className="delete-modal-delete-btn"
                onClick={handleDeleteNote}
              >
                Delete Note
              </button>
            </div>

            {/* Decorative elements */}
            <div className="delete-modal-decoration-1" />
            <div className="delete-modal-decoration-2" />
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default Notes;

