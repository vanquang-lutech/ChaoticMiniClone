# Chaotic Custom UI Test

Next.js custom apparel studio inspired by the Threadheads oversized tee customiser. The UI is
wired to the sibling `ChaoticCustomAI` FastAPI project for uploads, background removal, image
generation, stylised text, job polling, files and usage.

## Run

Start the FastAPI stack from `ChaoticCustomAI` first (API, worker and Redis), then run:

```bash
copy .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3001` or `/products/custom-oversized-tee`.

`CHAOTIC_CUSTOM_AI_URL` defaults to `http://localhost:8000`. All browser requests stay on the
Next.js origin and are proxied by `next.config.ts`, so the backend does not need CORS changes.

Text style thumbnails in `public/text-styles/` are copied from
`../ChaoticCustomAI/assets/text-styles/`, matching the preset names accepted by the API. The
copy is refreshed automatically before `npm run dev` and `npm run build`. In deployments where
the backend repository is not present (such as Vercel), the build safely uses the committed
copies under `public/text-styles/` instead.
