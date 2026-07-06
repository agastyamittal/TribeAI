# TribeAI

TribeAI is a B2B SaaS platform that captures tacit knowledge from experienced manufacturing professionals before they retire. It conducts AI-powered voice interviews, extracts structured knowledge entries, and makes that expertise searchable through a RAG-powered Digital Expert.

## The Problem

When veteran manufacturing workers retire, decades of undocumented expertise, such as sensory diagnostics, workarounds, and troubleshooting sequences, leaves with them. Training manuals can't capture that type of knowledge.

## How It Works

TribeAI follows a four stage pipeline:

```
Enroll Expert --> AI Interview --> Knowledge Extraction --> Digital Expert (RAG)
  (Dashboard)     (Voice Chat)      (Auto-extract +         (Search & Ask)
                                     Human Validation)
```

1. **Enroll**: A plant manager enrolls an at risk expert with their role and retirement date.
2. **Interview**: The expert has a voice conversation with an AI interviewer that probes for tacit knowledge. Four interview triggers are supported so far: retirement knowledge transfer, critical incident capture, specific topic deep dive, and system detected knowledge gaps.
3. **Extract & Validate**: Claude analyzes the interview transcript and extracts structured knowledge entries (machine quirks, troubleshooting sequences, techniques, material behaviors). A human reviewer validates or rejects each entry.
4. **Digital Expert**: Validated knowledge is embedded in a vector database. Any worker can ask questions and get answers sourced from the captured expertise, with citations back to the original expert.

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2 | UI framework |
| Vite | 8.0 | Build tool and dev server with HMR |
| Tailwind CSS | 4.3 | Utility first styling |
| React Router | 7.18 | Client side routing |
| Lucide React | 1.21 | Icon library |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.115 | REST API framework |
| Uvicorn | 0.34 | ASGI server |
| Anthropic SDK | 0.52 | Claude API client for interviews, extraction, and RAG |
| ChromaDB | 0.6 | Vector database for knowledge embedding and semantic search |
| Pydantic | 2.10 | Request/response validation |

### External APIs

| Service | Purpose |
|---|---|
| Claude (Anthropic) | Powers the AI interviewer, knowledge extraction, and Digital Expert answers |
| Deepgram | Real-time speech-to-text via WebSocket for voice interviews |
| Web Speech API | Browser-native text-to-speech for reading AI responses aloud |

## Architecture

The application is split into a React frontend and a FastAPI backend that communicate over REST. The Vite dev server proxies all `/api` requests from the frontend (port 5173) to the backend (port 8000).

The frontend handles all user facing interaction across four pages. The Interview page has an additional direct connection to Deepgram's speech to text API over WebSocket for real time voice transcription, managed by a custom `useVoice` React hook. AI responses are read aloud using the browser's built in Web Speech API.

The backend is a single FastAPI application (`main.py`) that orchestrates three external services. Claude (via the Anthropic SDK) powers the AI interviewer, the knowledge extraction engine, and the Digital Expert's answer generation. ChromaDB runs as an in memory vector database that stores embeddings of validated knowledge entries for semantic retrieval. All application state (experts, sessions, knowledge entries) is currently held in Python dictionaries, meaning data is lost on server restart.

### Frontend Pages

- **`/`**: Dashboard. Plant managers enroll experts and launch interview sessions.
- **`/interview?expert=<id>`**: Interview page. Voice first chat interface with real time Deepgram transcription and text to speech playback of AI responses.
- **`/validation`**: Knowledge validation. Displays extracted knowledge entries for human review (approve/reject).
- **`/expert`**: Digital Expert. Chat interface where any worker can ask questions and get RAG powered answers from validated knowledge.

### Backend Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/experts` | List all enrolled experts |
| `POST` | `/api/experts` | Enroll a new expert |
| `POST` | `/api/interviews/start` | Start an interview session (Claude generates opening question) |
| `POST` | `/api/interviews/message` | Send a message and get Claude's next interview question |
| `GET` | `/api/interviews/:id` | Get full interview session data |
| `POST` | `/api/extract/:session_id` | Extract structured knowledge from interview transcript |
| `GET` | `/api/knowledge` | List knowledge entries (filterable by expert, status) |
| `POST` | `/api/knowledge/validate` | Approve or reject a knowledge entry |
| `POST` | `/api/ask` | Ask the Digital Expert a question (RAG) |
| `GET` | `/api/deepgram-key` | Get Deepgram API key for frontend WebSocket |
| `GET` | `/api/health` | Health check |

### Voice Pipeline

The interview page uses a custom `useVoice` React hook that manages the full voice pipeline:

1. User clicks the mic button
2. Browser requests microphone access
3. Audio is captured, converted to 16 bit PCM at 16kHz
4. PCM frames are streamed over WebSocket to Deepgram's real time STT API
5. Interim and final transcripts are displayed live
6. On utterance end (1.5s silence), the transcript is auto-submitted to the backend
7. Claude's response is read aloud using the browser's Web Speech API

### RAG Pipeline (Digital Expert)

1. When knowledge entries are validated, they are embedded into ChromaDB using the default `all-MiniLM-L6-v2` sentence transformer
2. When a user asks a question, the query is embedded and the top 5 most similar knowledge entries are retrieved
3. Retrieved entries are passed as context to Claude with a system prompt that constrains answers to the provided knowledge base
4. The answer and source citations are returned to the frontend

## Project Structure

```
tribeai/
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Router and layout
│   │   ├── hooks/
│   │   │   └── useVoice.js      # Deepgram STT + browser TTS hook
│   │   └── pages/
│   │       ├── Dashboard.jsx    # Expert enrollment
│   │       ├── Interview.jsx    # Voice interview interface
│   │       ├── Validation.jsx   # Knowledge review
│   │       └── DigitalExpert.jsx# RAG Q&A interface
│   ├── package.json
│   └── vite.config.js           # Dev proxy /api -> localhost:8000
│
└── backend/
    ├── main.py                  # FastAPI app, all endpoints
    ├── requirements.txt
    ├── .env                     # API keys (not committed)
    └── .env.example             # Template for required keys
```

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)
- A [Deepgram API key](https://console.deepgram.com/)

### Backend

```bash
cd tribeai/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure API keys
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY and DEEPGRAM_API_KEY

# Start the server
uvicorn main:app --reload
```

### Frontend

```bash
cd tribeai/frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173**. The Vite dev server proxies all `/api` requests to the backend on port 8000.

## Current Limitations

- **In memory storage**: All data (experts, sessions, knowledge) is stored in Python dicts and lost on server restart. No database yet.
- **No authentication**: No user accounts or access control.
- **Synchronous API calls**: Claude API calls block the request thread. Would need async handling for production.
- **ChromaDB ephemeral**: Vector embeddings are in memory and lost on restart along with the other state.
- **Single user**: No multi tenancy or concurrent session isolation.
