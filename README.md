# Construction Tracker

A modern construction project management application built with Vue 3 and Python FastAPI.

## Features

- **Project Management**: Track multiple construction projects with detailed information
- **Task Tracking**: Create, assign, and monitor tasks across projects
- **RFIs & Submittals**: Manage Requests for Information and submittals
- **Change Orders**: Track change orders with approval workflows
- **Document Management**: Upload and organize project documents
- **User Roles**: Admin, Project Manager, Superintendent, Foreman, User roles
- **Activity Logging**: Track all project activities and changes
- **Real-time Updates**: Powered by Supabase real-time subscriptions

## Tech Stack

### Frontend
- Vue 3 with Composition API
- PrimeVue UI components
- Tailwind CSS
- Pinia state management
- Vue Router
- Vite build tool

### Backend
- Python FastAPI
- Supabase (PostgreSQL)
- JWT Authentication
- SQLAlchemy ORM

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- Supabase account

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local`:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Start development server:
```bash
npm run dev
```

### Backend Setup

See [`construction-tracker-backend/README.md`](../construction-tracker-backend/README.md) for backend setup instructions.

## Project Structure

```
src/
├── views/          # Page components
├── components/     # Reusable components
├── stores/         # Pinia stores
├── services/       # API services
├── composables/    # Composition functions
├── router/         # Vue Router config
├── utils/          # Utility functions
└── constants/      # App constants
```

## Development

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code

## Documentation

See [`DEVELOPMENT.md`](./DEVELOPMENT.md) for detailed development guidelines and architecture documentation.

## License

Private - All Rights Reserved
