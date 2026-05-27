# PoliCRM

A modern CRM for political parties, featuring voter verification, electorate mapping, and campaign management.

## Features

- **Dashboard**: Real-time stats on member verification and campaign progress
- **Contact Management**: Add, edit, tag, and manage party members
- **Electoral Roll Search**: Fuzzy search against ERA electoral roll data
- **Campaign HQ (War Room)**: Interactive electorate map with member distribution visualisation
- **AEC Verification**: Automated background verification of voter enrollment status
- **CSV Import/Export**: Bulk data operations with drag-and-drop support

## Prerequisites

- **Python 3.x**: Backend API
- **Node.js 18+**: Frontend development
- **PostgreSQL**: Database (optional, SQLite supported)
- **Firefox Browser**: Required for AEC verification (Selenium)

## Quick Start

1. **Clone and setup**:

   ```bash
   git clone <repository-url>
   cd PoliCRM
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Configure environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start the CRM**:
   ```bash
   ./run_crm.sh
   ```
   This starts the backend API at `http://localhost:8000` and frontend at `http://localhost:5173`.

## Environment Variables

| Variable           | Description                      | Default              |
| ------------------ | -------------------------------- | -------------------- |
| `DATABASE_URL`     | Database connection string       | `sqlite:///./crm.db` |
| `FIREBASE_*`       | Firebase authentication config   | -                    |
| `GECKODRIVER_PATH` | Path to geckodriver for Selenium | Auto-detect          |

## Project Structure

```
├── frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route pages
│   │   ├── stores/      # Nanostores state management
│   │   └── services/    # API client
├── src/
│   ├── api/            # FastAPI backend
│   │   ├── routers/    # API route handlers
│   │   └── models/     # SQLAlchemy models
│   ├── aec_core/       # AEC verification logic
│   └── utils/          # Utility scripts
├── run_crm.sh          # Start script
└── requirements.txt    # Python dependencies
```

## Development

**Frontend only**:

```bash
cd frontend
npm install
npm run dev
```

**Backend only**:

```bash
uvicorn src.api.main:app --reload --port 8000
```

## Documentation

- [Implementation Details](./SUMMARY.md)
- [Case Study](./CASE_STUDY.md)

## License

MIT License - see [LICENSE](./LICENSE)
