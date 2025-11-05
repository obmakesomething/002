const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();

const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'application/epub+zip'];
        if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.epub')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and EPUB files are allowed.'));
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Access code from environment variable
const ACCESS_CODE = process.env.ACCESS_CODE || '웰시댕구';

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.authenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// ================================
// Authentication Routes
// ================================

// Simple access code authentication
app.post('/api/access', (req, res) => {
    try {
        const { accessCode } = req.body;

        if (!accessCode) {
            return res.status(400).json({ error: 'Access code is required' });
        }

        if (accessCode === ACCESS_CODE) {
            req.session.authenticated = true;
            req.session.userId = 1; // Single user system
            res.json({ message: 'Access granted' });
        } else {
            res.status(401).json({ error: 'Invalid access code' });
        }
    } catch (error) {
        console.error('Access error:', error);
        res.status(500).json({ error: 'Access failed' });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Check if user already exists
        const existingUser = db.getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const userId = db.createUser(username, hashedPassword, email);

        req.session.userId = userId;
        res.json({ message: 'Registration successful', userId });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Get user
        const user = db.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.userId = user.id;
        res.json({ message: 'Login successful', userId: user.id, username: user.username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logout successful' });
    });
});

app.get('/api/auth/check', (req, res) => {
    if (req.session.authenticated) {
        res.json({ authenticated: true, userId: 1, username: 'User' });
    } else {
        res.json({ authenticated: false });
    }
});

// ================================
// Book Management Routes
// ================================

app.post('/api/books/upload', isAuthenticated, upload.single('book'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const bookId = db.createBook(
            req.session.userId,
            req.file.originalname,
            req.file.filename,
            req.file.mimetype,
            req.file.size
        );

        res.json({
            message: 'Book uploaded successfully',
            bookId,
            filename: req.file.filename,
            originalName: req.file.originalname
        });
    } catch (error) {
        console.error('Book upload error:', error);
        res.status(500).json({ error: 'Book upload failed' });
    }
});

app.get('/api/books', isAuthenticated, (req, res) => {
    try {
        const books = db.getBooksByUserId(req.session.userId);
        res.json(books);
    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({ error: 'Failed to retrieve books' });
    }
});

app.get('/api/books/:id', isAuthenticated, (req, res) => {
    try {
        const book = db.getBookById(req.params.id);

        if (!book || book.user_id !== req.session.userId) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.json(book);
    } catch (error) {
        console.error('Get book error:', error);
        res.status(500).json({ error: 'Failed to retrieve book' });
    }
});

app.delete('/api/books/:id', isAuthenticated, (req, res) => {
    try {
        const book = db.getBookById(req.params.id);

        if (!book || book.user_id !== req.session.userId) {
            return res.status(404).json({ error: 'Book not found' });
        }

        db.deleteBook(req.params.id);
        res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({ error: 'Failed to delete book' });
    }
});

// ================================
// Reading Progress Routes
// ================================

app.post('/api/progress', isAuthenticated, (req, res) => {
    try {
        const { bookId, currentPage, totalPages, progress, readingTime } = req.body;

        db.updateProgress(
            req.session.userId,
            bookId,
            currentPage,
            totalPages,
            progress,
            readingTime
        );

        res.json({ message: 'Progress updated' });
    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

app.get('/api/progress/:bookId', isAuthenticated, (req, res) => {
    try {
        const progress = db.getProgress(req.session.userId, req.params.bookId);
        res.json(progress || {});
    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({ error: 'Failed to retrieve progress' });
    }
});

// ================================
// Notes & Annotations Routes
// ================================

app.post('/api/notes', isAuthenticated, (req, res) => {
    try {
        const { bookId, page, text, note, highlightColor } = req.body;

        const noteId = db.createNote(
            req.session.userId,
            bookId,
            page,
            text,
            note,
            highlightColor
        );

        res.json({ message: 'Note created', noteId });
    } catch (error) {
        console.error('Create note error:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

app.get('/api/notes/:bookId', isAuthenticated, (req, res) => {
    try {
        const notes = db.getNotesByBook(req.session.userId, req.params.bookId);
        res.json(notes);
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ error: 'Failed to retrieve notes' });
    }
});

app.put('/api/notes/:id', isAuthenticated, (req, res) => {
    try {
        const { note } = req.body;
        db.updateNote(req.params.id, note);
        res.json({ message: 'Note updated' });
    } catch (error) {
        console.error('Update note error:', error);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

app.delete('/api/notes/:id', isAuthenticated, (req, res) => {
    try {
        db.deleteNote(req.params.id);
        res.json({ message: 'Note deleted' });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// ================================
// Vocabulary Routes
// ================================

app.post('/api/vocabulary', isAuthenticated, (req, res) => {
    try {
        const { word, translation, grammar, context } = req.body;

        const vocabId = db.addVocabulary(
            req.session.userId,
            word,
            translation,
            grammar,
            context
        );

        res.json({ message: 'Vocabulary added', vocabId });
    } catch (error) {
        console.error('Add vocabulary error:', error);
        res.status(500).json({ error: 'Failed to add vocabulary' });
    }
});

app.get('/api/vocabulary', isAuthenticated, (req, res) => {
    try {
        const vocabulary = db.getVocabularyByUser(req.session.userId);
        res.json(vocabulary);
    } catch (error) {
        console.error('Get vocabulary error:', error);
        res.status(500).json({ error: 'Failed to retrieve vocabulary' });
    }
});

app.delete('/api/vocabulary/:id', isAuthenticated, (req, res) => {
    try {
        db.deleteVocabulary(req.params.id);
        res.json({ message: 'Vocabulary deleted' });
    } catch (error) {
        console.error('Delete vocabulary error:', error);
        res.status(500).json({ error: 'Failed to delete vocabulary' });
    }
});

app.delete('/api/vocabulary', isAuthenticated, (req, res) => {
    try {
        db.clearVocabulary(req.session.userId);
        res.json({ message: 'All vocabulary cleared' });
    } catch (error) {
        console.error('Clear vocabulary error:', error);
        res.status(500).json({ error: 'Failed to clear vocabulary' });
    }
});

// ================================
// Statistics Routes
// ================================

app.get('/api/stats', isAuthenticated, (req, res) => {
    try {
        const stats = db.getUserStats(req.session.userId);
        res.json(stats);
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to retrieve stats' });
    }
});

// ================================
// Start Server
// ================================

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 PDF/EPUB Reader with Translator`);
});
