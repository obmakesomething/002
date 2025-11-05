# PDF/EPUB Reader with Translator & Bionic Reading

A comprehensive web-based reading application with translation, grammar explanation, vocabulary management, and advanced Bionic Reading features for enhanced learning.

## ✨ Key Features

### 📖 Document Support
- **PDF & EPUB Support**: Read both PDF and EPUB files seamlessly
- **Table of Contents**: Navigate through books with interactive TOC
- **Page Navigation**: Easy page turning and zoom controls
- **Progress Tracking**: Automatically saves your reading progress

### 🌐 Learning Tools
- **Real-time Translation**: Instant Korean translation of selected text
- **Grammar Explanation**: Detailed grammar analysis with tense detection
- **Vocabulary Management**: Save and organize unknown words
- **Context-aware Notes**: Add annotations and highlights to any text

### 🧠 Bionic Reading
- **Fixation Control**: Adjust the number of bold characters (1-5)
- **Saccade Adjustment**: Control word spacing for optimal eye movement
- **Opacity Settings**: Fine-tune emphasis intensity (1-100%)
- **Dual Modes**: Choose between Letters or Syllables emphasis
- **Flexible Application**: Apply to entire document or selection only

### 🔐 User Management
- **Secure Authentication**: Private user accounts with encrypted passwords
- **Personal Library**: Upload and manage your book collection
- **Reading Statistics**: Track your learning progress over time
- **Cross-device Sync**: Access your books from any device

### 📱 Modern Interface
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Themes**: Comfortable reading in any environment
- **Intuitive Controls**: Easy-to-use interface for all features

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd 002
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and set your SESSION_SECRET
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📚 How to Use

### 1. Create an Account
- Navigate to `http://localhost:3000/login.html`
- Register with a username and password
- Login to access your personal library

### 2. Upload a Book
- Click the "Upload PDF/EPUB" button
- Select your PDF or EPUB file
- The book will appear in your library

### 3. Read and Learn
- **Select text** to get instant translation and grammar explanation
- Click **"Add to Vocabulary"** to save important words
- Use the **Table of Contents** for easy navigation
- Adjust **zoom** and **page controls** as needed

### 4. Enable Bionic Reading
- Click the **"🧠 Bionic Reading"** button in the header
- Toggle **"Enable Bionic Reading"** checkbox
- Adjust settings:
  - **Fixation**: How many letters to emphasize
  - **Saccade**: How often to emphasize words
  - **Opacity**: How bold the emphasis appears
  - **Mode**: Letters or Syllables
- Click **"Apply Settings"** to see changes

### 5. Manage Vocabulary
- View saved words in the **Vocabulary** panel
- Export your word list to JSON
- Review translations and grammar notes

## 🛠 Technology Stack

### Frontend
- **PDF.js** - PDF rendering engine
- **EPUB.js** - EPUB reader
- **Vanilla JavaScript** - No framework dependencies
- **Modern CSS** - Responsive and beautiful UI

### Backend
- **Node.js & Express** - Server framework
- **SQLite** - Lightweight database
- **better-sqlite3** - Fast SQLite driver
- **bcryptjs** - Password encryption
- **express-session** - Session management

## 📁 Project Structure

```
002/
├── public/              # Frontend files
│   ├── index.html       # Main reader interface
│   ├── login.html       # Login/register page
│   ├── styles.css       # All styles
│   └── app.js           # Frontend logic
├── uploads/             # User-uploaded books
├── server.js            # Express server
├── database.js          # Database operations
├── package.json         # Dependencies
├── .env.example         # Environment template
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file with:
```
PORT=3000
SESSION_SECRET=your-secret-key-here
```

### Database
The SQLite database (`reader.db`) is created automatically on first run. It stores:
- User accounts
- Book metadata
- Reading progress
- Vocabulary entries
- Notes and annotations

## 🌐 API Endpoints

### Authentication
- `POST /api/register` - Create new account
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/auth/check` - Check authentication status

### Books
- `POST /api/books/upload` - Upload PDF/EPUB
- `GET /api/books` - Get user's book library
- `GET /api/books/:id` - Get specific book
- `DELETE /api/books/:id` - Delete book

### Vocabulary
- `POST /api/vocabulary` - Add new word
- `GET /api/vocabulary` - Get all saved words
- `DELETE /api/vocabulary/:id` - Delete word
- `DELETE /api/vocabulary` - Clear all words

### Progress & Notes
- `POST /api/progress` - Update reading progress
- `GET /api/progress/:bookId` - Get reading progress
- `POST /api/notes` - Create annotation
- `GET /api/notes/:bookId` - Get book annotations

## 🎨 Customization

### Bionic Reading Settings
The Bionic Reading feature can be customized through the UI or programmatically:

```javascript
bionicSettings = {
    enabled: true,
    fixation: 2,       // 1-5 characters to emphasize
    saccade: 1,        // Word spacing (every N words)
    opacity: 70,       // Emphasis intensity (1-100%)
    mode: 'letters',   // 'letters' or 'syllables'
    apply: 'all'       // 'all' or 'selection'
};
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📄 License

MIT License - Feel free to use this project for learning and development.

## 🙏 Acknowledgments

- **PDF.js** by Mozilla - PDF rendering
- **EPUB.js** by FuturePress - EPUB reading
- **MyMemory Translation API** - Free translation service
- **Bionic Reading®** - Inspiration for the reading enhancement feature

## 📞 Support

If you encounter any issues or have questions:
1. Check the browser console for error messages
2. Ensure Node.js and all dependencies are installed
3. Verify the database file has write permissions
4. Check that port 3000 is available

## 🔮 Future Enhancements

- [ ] Text-to-speech functionality
- [ ] More translation language options
- [ ] Advanced NLP for better grammar analysis
- [ ] Flashcard generation from vocabulary
- [ ] Reading goals and achievements
- [ ] Book sharing and recommendations
- [ ] Mobile app versions (iOS/Android)

---

**Built with ❤️ for language learners**
