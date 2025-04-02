# VJ Event Sync & Logo Management Tool

A lightweight cross-platform application for VJs to manage events, logos, and timers with Resolume integration.

## Features

- **Event Synchronization**: Sync events from vj.tools with offline support
- **Logo Management**: Organize and display logos for events
- **Timer Control**: Set timers for sets with visual countdown
- **Messaging System**: Communicate with other VJs and event organizers
- **OSC Integration**: Control Resolume via OSC
- **NDI Support**: Stream logos directly to Resolume via NDI
- **Resolume Wire Plugin**: Seamless integration with Resolume

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vj-event-sync.git
   cd vj-event-sync
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run tauri dev
   ```

### Building for Production

To build the application for your platform:

```bash
npm run tauri build
```

This will create a standalone executable in the `src-tauri/target/release` directory.

## Architecture

The application is built with:

- **Frontend**: Vue.js 3 with Vite
- **Backend**: Node.js with Express
- **Desktop Framework**: Tauri (Rust)
- **Database**: SQLite
- **Communication**: Socket.io for real-time updates

## Development

### Project Structure

```
vj-event-sync/
├── src/
│   ├── client/           # Vue.js frontend
│   │   ├── components/   # Vue components
│   │   ├── services/     # API services
│   │   └── ...
│   ├── server/           # Node.js backend
│   │   ├── controllers/  # API controllers
│   │   ├── models/       # Data models
│   │   └── ...
│   └── wire/             # Resolume Wire plugin
├── src-tauri/            # Tauri (Rust) code
│   ├── src/              # Rust source code
│   └── ...
├── public/               # Static assets
└── ...
```

### Adding New Features

1. Create new Vue components in `src/client/components/`
2. Add API endpoints in `src/server/controllers/`
3. Update the Tauri commands in `src-tauri/src/main.rs` if needed

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Tauri](https://tauri.app/) - For the lightweight desktop framework
- [Vue.js](https://vuejs.org/) - For the frontend framework
- [Resolume](https://resolume.com/) - For the VJ software integration 