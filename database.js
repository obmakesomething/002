const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const db = new Database(path.join(__dirname, 'reader.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// ================================
// Create Tables
// ================================

function initializeDatabase() {
    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Books table
    db.exec(`
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            filename TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Reading progress table
    db.exec(`
        CREATE TABLE IF NOT EXISTS reading_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            book_id INTEGER NOT NULL,
            current_page INTEGER DEFAULT 0,
            total_pages INTEGER DEFAULT 0,
            progress REAL DEFAULT 0,
            reading_time INTEGER DEFAULT 0,
            last_read DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
            UNIQUE(user_id, book_id)
        )
    `);

    // Notes and annotations table
    db.exec(`
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            book_id INTEGER NOT NULL,
            page INTEGER,
            selected_text TEXT,
            note TEXT,
            highlight_color TEXT DEFAULT '#ffeb3b',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        )
    `);

    // Vocabulary table
    db.exec(`
        CREATE TABLE IF NOT EXISTS vocabulary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            word TEXT NOT NULL,
            translation TEXT,
            grammar TEXT,
            context TEXT,
            review_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    console.log('✅ Database initialized successfully');
}

// Ensure default user exists (for single-user system)
function ensureDefaultUser() {
    try {
        // Use INSERT OR IGNORE to avoid errors if user already exists
        const result = db.prepare(`
            INSERT OR IGNORE INTO users (id, username, password, email)
            VALUES (?, ?, ?, ?)
        `).run(1, 'default_user', 'no_password_needed', null);

        if (result.changes > 0) {
            console.log('👤 Created default user (id=1)');
        } else {
            console.log('👤 Default user (id=1) already exists');
        }
    } catch (error) {
        console.error('Error ensuring default user:', error);
        // Try to check if user exists
        const user = db.prepare('SELECT id FROM users WHERE id = 1').get();
        if (!user) {
            console.error('⚠️  WARNING: Default user does not exist! Upload will fail!');
        }
    }
}

// Initialize database on startup
initializeDatabase();
ensureDefaultUser();

// ================================
// User Operations
// ================================

function createUser(username, password, email = null) {
    const stmt = db.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)');
    const result = stmt.run(username, password, email);
    return result.lastInsertRowid;
}

function getUserByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
}

function getUserById(id) {
    const stmt = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?');
    return stmt.get(id);
}

// ================================
// Book Operations
// ================================

function createBook(userId, title, filename, fileType, fileSize) {
    const stmt = db.prepare(`
        INSERT INTO books (user_id, title, filename, file_type, file_size)
        VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userId, title, filename, fileType, fileSize);
    return result.lastInsertRowid;
}

function getBooksByUserId(userId) {
    const stmt = db.prepare(`
        SELECT b.*, rp.progress, rp.current_page, rp.last_read
        FROM books b
        LEFT JOIN reading_progress rp ON b.id = rp.book_id AND b.user_id = rp.user_id
        WHERE b.user_id = ?
        ORDER BY b.uploaded_at DESC
    `);
    return stmt.all(userId);
}

function getBookById(bookId) {
    const stmt = db.prepare('SELECT * FROM books WHERE id = ?');
    return stmt.get(bookId);
}

function deleteBook(bookId) {
    const stmt = db.prepare('DELETE FROM books WHERE id = ?');
    return stmt.run(bookId);
}

// ================================
// Reading Progress Operations
// ================================

function updateProgress(userId, bookId, currentPage, totalPages, progress, readingTime) {
    const stmt = db.prepare(`
        INSERT INTO reading_progress (user_id, book_id, current_page, total_pages, progress, reading_time, last_read)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, book_id)
        DO UPDATE SET
            current_page = excluded.current_page,
            total_pages = excluded.total_pages,
            progress = excluded.progress,
            reading_time = reading_time + excluded.reading_time,
            last_read = CURRENT_TIMESTAMP
    `);
    return stmt.run(userId, bookId, currentPage, totalPages, progress, readingTime);
}

function getProgress(userId, bookId) {
    const stmt = db.prepare(`
        SELECT * FROM reading_progress
        WHERE user_id = ? AND book_id = ?
    `);
    return stmt.get(userId, bookId);
}

// ================================
// Notes Operations
// ================================

function createNote(userId, bookId, page, text, note, highlightColor = '#ffeb3b') {
    const stmt = db.prepare(`
        INSERT INTO notes (user_id, book_id, page, selected_text, note, highlight_color)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userId, bookId, page, text, note, highlightColor);
    return result.lastInsertRowid;
}

function getNotesByBook(userId, bookId) {
    const stmt = db.prepare(`
        SELECT * FROM notes
        WHERE user_id = ? AND book_id = ?
        ORDER BY page, created_at
    `);
    return stmt.all(userId, bookId);
}

function updateNote(noteId, note) {
    const stmt = db.prepare(`
        UPDATE notes
        SET note = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    return stmt.run(note, noteId);
}

function deleteNote(noteId) {
    const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
    return stmt.run(noteId);
}

// ================================
// Vocabulary Operations
// ================================

function addVocabulary(userId, word, translation, grammar, context) {
    const stmt = db.prepare(`
        INSERT INTO vocabulary (user_id, word, translation, grammar, context)
        VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userId, word, translation, grammar, context);
    return result.lastInsertRowid;
}

function getVocabularyByUser(userId) {
    const stmt = db.prepare(`
        SELECT * FROM vocabulary
        WHERE user_id = ?
        ORDER BY created_at DESC
    `);
    return stmt.all(userId);
}

function deleteVocabulary(vocabId) {
    const stmt = db.prepare('DELETE FROM vocabulary WHERE id = ?');
    return stmt.run(vocabId);
}

function clearVocabulary(userId) {
    const stmt = db.prepare('DELETE FROM vocabulary WHERE user_id = ?');
    return stmt.run(userId);
}

// ================================
// Statistics Operations
// ================================

function getUserStats(userId) {
    const totalBooks = db.prepare('SELECT COUNT(*) as count FROM books WHERE user_id = ?').get(userId).count;
    const totalVocab = db.prepare('SELECT COUNT(*) as count FROM vocabulary WHERE user_id = ?').get(userId).count;
    const totalNotes = db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ?').get(userId).count;

    const totalReadingTime = db.prepare(`
        SELECT SUM(reading_time) as total FROM reading_progress WHERE user_id = ?
    `).get(userId).total || 0;

    const booksInProgress = db.prepare(`
        SELECT COUNT(*) as count FROM reading_progress
        WHERE user_id = ? AND progress > 0 AND progress < 100
    `).get(userId).count;

    const booksCompleted = db.prepare(`
        SELECT COUNT(*) as count FROM reading_progress
        WHERE user_id = ? AND progress >= 100
    `).get(userId).count;

    return {
        totalBooks,
        totalVocab,
        totalNotes,
        totalReadingTime,
        booksInProgress,
        booksCompleted
    };
}

// Export all functions
module.exports = {
    db,
    createUser,
    getUserByUsername,
    getUserById,
    createBook,
    getBooksByUserId,
    getBookById,
    deleteBook,
    updateProgress,
    getProgress,
    createNote,
    getNotesByBook,
    updateNote,
    deleteNote,
    addVocabulary,
    getVocabularyByUser,
    deleteVocabulary,
    clearVocabulary,
    getUserStats
};
