# ProofFlow

Takes a milestone from "we delivered it" to "the client accepted it, and payment falls due on this date". The customer's own Claude reads contracts and writes acceptance packs through ProofFlow's MCP tools. ProofFlow keeps the record. There is no AI inside this app.

Prototype. Every company and person in the demo data is fictional. See `SPEC.md` for the full spec.

## Test login

- URL: https://model-context-protocol-mcp-with-nex-eight-blush.vercel.app
- Email: `demo@brightfield.example`
- Password: `Brightfield-9297b137`

## Run locally

Needs Node 24 and a MongoDB Atlas database. Copy `.env.example` to `.env.local` and fill it in.

```
npm install
npm run db:push    # create indexes
npm run db:seed    # reset the fictional demo workspace (dates relative to today, IST)
npm run dev
npm test
npm run check:no-ai
```

## Deploy

Push to `main`. Vercel builds it. The Vercel project needs `MONGO_URI` and `SESSION_SECRET`.
