# VJ Event Sync & Logo Management Tool for Resolume

A comprehensive tool for synchronizing events from vj.tools, managing logos, and controlling video playback with Resolume integration.

## Features

- Event synchronization with vj.tools
- Offline support with local caching
- Video playback with timer-based triggers
- Web interface for local network control
- OSC integration for real-time control
- NDI video streaming support
- Resolume Wire plugin integration

## Prerequisites

- Node.js (v16 or higher)
- NDI SDK
- VLC Media Player
- Resolume Arena/Avenue (for Wire plugin integration)

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd vj-event-sync
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
PORT=3000
OSC_PORT=12345
NDI_ENABLED=true
VLC_PATH=/path/to/vlc
```

## Development

Start the development server:
```bash
npm run dev
```

Build the frontend:
```bash
npm run build:dev
```

## Production

Build and start the production server:
```bash
npm run build
npm start
```

## Project Structure

```
vj-event-sync/
├── src/
│   ├── server/           # Backend server code
│   ├── client/           # Frontend web application
│   ├── services/         # Core services (Event sync, OSC, NDI)
│   └── wire/            # Resolume Wire plugin
├── config/              # Configuration files
├── assets/             # Static assets (logos, etc.)
└── tests/              # Test files
```

## API Documentation

### Event Sync API
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get specific event
- `POST /api/events/sync` - Trigger manual sync

### OSC Endpoints
- `/logo/change` - Change current logo
- `/timer/start` - Start timer
- `/timer/stop` - Stop timer

### NDI Streams
- Main output: "VJ Event Sync Output"
- Preview output: "VJ Event Sync Preview"

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 