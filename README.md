# LJV - Lissajous Visualizer

A beautiful real-time music visualizer that creates mesmerizing Lissajous curves from your audio files. Built with modern web technologies and packaged as a native desktop application.

https://github.com/user-attachments/assets/023d03e6-edbb-4917-b737-868a8abc169c

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

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- Rust (latest stable)
- System dependencies for Tauri (see [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites))

### Installation

```bash
# Clone the repository
git clone https://github.com/ThatXliner/ljv/tree/main?tab=readme-ov-file
cd ljv

# Install dependencies
npm install
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. See [contributing guidelines](CONTRIBUTING.md) for more details.

## License

AGPL v3.0+

## Acknowledgments

- Inspired by the classic Lissajous curve oscilloscope visualizations
- Built with the amazing Tauri and Svelte ecosystems

---

<p align="center">
  Made with ❤️ using Tauri + SvelteKit
</p>
