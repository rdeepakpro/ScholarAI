# ScholarAI
<img width="1392" height="888" alt="image" src="https://github.com/user-attachments/assets/361232f8-1140-4e03-8faa-7b8b51afa33b" />

Turn what you're studying into lessons, notes, flashcards, quizzes, and study sessions.

ScholarAI is an open-source desktop study application for macOS and Windows. It turns your own material into a calm, source-grounded learning workflow, with optional AI that runs privately on your computer.

## Features

- **Generated Lessons** — ordered 3–10 minute lessons with explanations, examples, checkpoints, progress, and source excerpts.
- **Notes** — editable, saved notes with Markdown export.
- **Flashcards** — generated cards with Again, Hard, Good, and Easy spaced review.
- **Quizzes** — standalone question flows with explanations and stored attempts.
- **Ask** — class-level chat grounded in imported source chunks.
- **Study Mode** — unfinished lessons, weak concepts, due cards, and practice from real performance.
- **Personalization** — branching first-launch onboarding and preferences used in lesson generation.
- **Privacy** — user files, history, credentials, and downloaded models remain outside the source tree.
- **Appearance** — monochrome Light, Dark, and System modes.


https://github.com/user-attachments/assets/2bc8195b-4c70-4e5d-90f0-e8cc33a044ea


## Download

Unsigned development installers are produced for macOS Apple Silicon, macOS Intel, and Windows x64 from `v*` tags. Until signing is configured, macOS may show a Gatekeeper warning and Windows may show a SmartScreen warning.

## Local AI setup

During onboarding, choose Built-in Local AI or another OpenAI-compatible provider. This choice never starts a download. When you are ready, open **Settings → Models** to explicitly download Qwen 2.5 3B (the default local model, about 2.1 GB) or Qwen3 1.7B (lightweight, about 1.3 GB). ScholarAI checks disk space, shows real byte progress, supports cancellation and resume, verifies SHA-256, starts packaged llama.cpp, and tests the model before showing Ready. Models are not included in the installer.

## Building from source

Node.js is required only for contributors—not for people using an installer.

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run dev
```

`npm run dev` starts the Electron desktop app. Packaging commands download the pinned llama.cpp runtime for the requested target:

```bash
npm run package:mac
npm run package:mac:x64
npm run package:win
```

## Privacy

Imported documents and generated study data are stored locally. Model files and provider configuration live in Electron's operating-system application-data directory. Custom provider API keys use Electron `safeStorage` where available. `.gitignore` excludes model/runtime artifacts, environment files, exports, and local data directories.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Attribution is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

ScholarAI is available under the [MIT License](LICENSE). Downloaded Qwen models retain their model-specific upstream licenses; llama.cpp is MIT licensed.
