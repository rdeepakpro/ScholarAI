# Contributing

Thanks for helping improve ScholarAI.

1. Fork the repository and create a focused branch.
2. Run `npm install`.
3. Keep source separate from user data. Never commit imported material, exports, credentials, GGUF files, or app-data directories.
4. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` before opening a pull request.
5. Describe behavior changes and include screenshots for interface work.

AI prompts must preserve source grounding. Persistence changes must include a backward-compatible migration.
