# Quvirl Dual-Audience Marketing Agent v3.1

Targets **both** audiences automatically in one pipeline:
1. **Individual Content Creators, Influencers, Podcasters, YouTubers, Streamers & Clippers** → receives dedicated **Quvirl AI Video Lab** outreach (`https://quvirl.com/videolab`).
2. **Shopify & E-commerce Stores (preserved original target)** → receives **Quvirl Product Radar (100% Free) + AI Video Lab** outreach (`https://quvirl.com/product-research` & `https://quvirl.com/videolab`).

## Pipeline
1. **Discover (`npm run discover`)**: Queries SearXNG using interleaved Shopify store + creator/influencer/podcaster queries (`data/search-queries.json`).
   - Classifies creator hubs (`linktr.ee`, `beacons.ai`, `stan.store`, `carrd.co`, `bio.site`), podcast sites, media kits, and social snippets as `audience: "creator"` with `creatorType` (`podcaster`, `youtuber`, `streamer`, `influencer`, `clipper`, `creator`).
   - Detects Shopify storefronts as `audience: "ecommerce"` and scrapes public contact/about/privacy/support role emails (`info@`, `hello@`, `contact@`, `support@`, `sales@`, etc.).
2. **Draft (`npm run draft`)**: Automatically routes each unsent prospect by `audience`:
   - `creator` → tailored **Quvirl AI Video Lab** email (Free AI Preview, $4.50 Pay-On-Ready, zero $49/mo sub).
   - `ecommerce` (and legacy prospects) → **Product Radar + AI Video Lab** e-commerce email.
3. **Queue & Approve (`npm run queue` / `npm run approve`)**: Queues both creator and e-commerce `review_required` contacts into `data/approval-queue.json` (set `TARGET_AUDIENCE=creator` or `TARGET_AUDIENCE=ecommerce` to filter a run).
4. **Send (`npm run send`)**: Sends approved emails via SMTP with triple duplicate prevention:
   - Prospect must still have `status: new`.
   - Normalized email must not exist in any successful `data/send-log.json` entry.
   - Prospect ID must not exist in any successful `data/send-log.json` entry.

Keep `data/send-log.json` committed as the permanent do-not-resend record. Suppressed addresses in `data/suppression.json` are never sent. Keep the repository private and credentials in GitHub Secrets.
