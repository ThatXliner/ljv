# LJV - Lissajous Visualizer

A beautiful real-time music visualizer that creates mesmerizing Lissajous curves from your audio files. Built with modern web technologies and packaged as a native desktop application.

![Demo](./output.mov)

Note that the demo audio is scuffed because I'm recording the playback.

Music in the demo is [Razihel - Love U](http://ncs.io/loveu) provided by NoCopyrightSounds

## What are Lissajous Curves?

Lissajous curves are mathematical figures created by plotting two sinusoidal oscillations against each other. In LJV, the left and right audio channels are mapped to the X and Y axes respectively, creating stunning visual patterns that dance to your music.

## Features

- **Real-time Visualization**: Hardware-accelerated WebGL2 rendering for smooth 60fps performance
- **Beautiful Trail Effects**: Additive blending creates natural glowing trails
- **Audio File Support**: Load and visualize any audio file supported by your browser
- **Customizable Parameters**:
  - Point size and count
  - Trail length
  - Color customization
  - Rotation and zoom controls
  - Render modes (points/lines)
- **Native Desktop Experience**: Built with Tauri for a lightweight, secure application

## Technology Stack

- **Frontend**: SvelteKit + Svelte 5 (runes-based reactivity)
- **Desktop Runtime**: Tauri v2 (minimal Rust backend)
- **Rendering**: WebGL2 with custom GLSL shaders
- **Audio Processing**: Web Audio API (AnalyserNode, AudioContext)

## Architecture Highlights

LJV uses a **browser-heavy architecture** where audio processing and visualization happen entirely in the browser, with Tauri providing only file system access. This design choice:

- Avoids IPC overhead between frontend and backend
- Leverages the mature and powerful Web Audio API
- Achieves optimal performance through WebGL hardware acceleration
- Simplifies the codebase with a clear separation of concerns

### Key Technical Decisions

1. **Stereo Channel Mapping**: Left channel → X-axis, Right channel → Y-axis (classic Lissajous approach)
2. **WebGL Points Rendering**: Uses `GL_POINTS` primitive with circular buffer for efficient trail effects
3. **Svelte 5 Runes**: Modern reactive state management without external libraries
4. **Additive Blending**: Creates natural glow without expensive post-processing

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- Rust (latest stable)
- System dependencies for Tauri (see [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites))

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ljv

# Install dependencies
npm install
```

### Development

```bash
# Start the Tauri app in development mode
npm run tauri dev

# Or run just the frontend (for web development)
npm run dev
```

The Tauri development mode includes:
- Hot Module Replacement (HMR) for instant updates
- Automatic Rust recompilation on changes
- DevTools access for debugging

### Building

```bash
# Build the production desktop app
npm run tauri build
```

The built application will be available in `src-tauri/target/release/bundle/`.

### Type Checking

```bash
# One-time type check
npm run check

# Watch mode
npm run check:watch
```

## Project Structure

```
src/
├── lib/
│   ├── audio/              # Web Audio API integration
│   │   ├── AudioEngine.svelte.ts    # Audio playback & analysis
│   │   └── types.ts
│   ├── webgl/              # WebGL rendering pipeline
│   │   ├── LissajousRenderer.ts     # Core WebGL renderer
│   │   ├── shaders.ts               # GLSL vertex/fragment shaders
│   │   ├── utils.ts                 # WebGL helpers
│   │   └── types.ts
│   ├── math/
│   │   └── lissajous.ts    # Audio → Lissajous point conversion
│   ├── stores/
│   │   └── visualizer.svelte.ts     # Global reactive state
│   └── components/         # Svelte UI components
│       ├── Visualizer.svelte        # Canvas + render loop
│       ├── FileLoader.svelte        # Tauri file dialog
│       ├── Controls.svelte          # Playback & parameters
│       └── ColorPicker.svelte
└── routes/
    └── +page.svelte        # Main app layout

src-tauri/
├── src/
│   ├── lib.rs              # Tauri setup & plugin registration
│   └── main.rs
└── Cargo.toml
```

## How It Works

```
1. User selects audio file
   ↓
2. Tauri file dialog returns path
   ↓
3. File read via @tauri-apps/plugin-fs
   ↓
4. AudioEngine loads ArrayBuffer
   ↓
5. User presses play
   ↓
6. Render loop starts (requestAnimationFrame)
   ↓
7. AudioEngine provides time-domain data
   ↓
8. Convert to Lissajous points (left→X, right→Y)
   ↓
9. Upload to GPU via WebGL
   ↓
10. Render frame with additive blending
    ↓
11. Loop continues at 60fps
```

## Performance

LJV is optimized for smooth 60fps visualization:

- **Zero-copy audio processing**: Direct Float32Array manipulation
- **Circular buffer rendering**: Efficient trail effects without array operations
- **Hardware acceleration**: All rendering happens on the GPU
- **Minimal allocations**: Reuses buffers in the render loop
- **Debounced canvas resizing**: Prevents resize thrashing

## Development Tips

### Svelte 5 Runes in Modules

When using `$state` in `.svelte.ts` files, they must be class fields:

```typescript
// ✅ Correct
class MyState {
  value = $state(0);
}
export const state = new MyState();

// ❌ Wrong
export const state = {
  value: $state(0)  // Error: $state can only be used as class field
};
```

### WebGL Resource Management

Always clean up WebGL resources:

```typescript
onDestroy(() => {
  renderer?.destroy();  // Deletes buffers, VAOs, programs
  audioEngine.destroy(); // Closes AudioContext
});
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

AGPL v3.0+

## Acknowledgments

- Inspired by the classic Lissajous curve oscilloscope visualizations
- Built with the amazing Tauri and Svelte ecosystems

---

<p align="center">
  Made with ❤️ using Tauri + SvelteKit
</p>
