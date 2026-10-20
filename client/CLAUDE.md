# Frontend guidance

The frontend was reset at the user's request. Only the homepage, shared layout,
Clerk provider/proxy, and minimal auth navigation remain. Previous pages, API
handlers, feature components, and data helpers were intentionally removed.
Do not restore them as the starting point for the rebuild.

Read [TASKS.md](TASKS.md) before UI work and [README.md](README.md) for commands.
Use Next.js 16 App Router and keep `src/proxy.ts`. Use the FastAPI backend for
rebuilt domain flows; legacy Prisma/deployment artifacts are historical only.

All new UI is mobile first: begin with a single-column phone layout, accessible
forms and touch controls, then add larger-screen adaptations. Verify loading,
empty, success and failure states on narrow screens. Follow task acceptance
criteria before marking work done. Never remove or migrate stored data as part
of a UI reset.
