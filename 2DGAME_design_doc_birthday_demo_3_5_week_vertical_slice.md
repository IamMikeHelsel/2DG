# Toodeegame — Design Doc (Birthday Demo & 3–5 Week Vertical Slice)

**Date:** August 11, 2025\
**Owner:** You (+ friends/community)\
**Goal:** Ship a polished, browser‑playable 2D MMO slice that dozens can play together, then grow it into a sticky live prototype.

---

# 1) One‑page summary

**Vision:** *Old‑school MMO feel with modern glow.* Think Tibia’s systems + Ori‑style atmosphere: crisp pixel art, dynamic lights, particles, and clean UX — all in the browser.

**Birthday slice (Aug 16, 2025):**

- One small **Michigan‑inspired dungeon/town map** (32×32 tiles).
- **Movement, chat, basic melee**, health/respawn, NPC shop, save/load.
- Stable **30–60 FPS** and **30–40 CCU** in one room.

**Vertical slice (3–5 weeks):**

- **Two zones** (town + mini‑dungeon w/ boss).
- **Combat loop** (melee + basic ranged), **XP/level**, **loot/inventory**, **party**, **overflow instance** at 40+ players.
- **Closed playtests** 2–3×/week; founder cosmetic rewards.

**Why it will work:** Web tech (Phaser + Colyseus) + tight scope + good lighting/VFX polish = compelling feel quickly, without heavy engine overhead.

---

# 2) Product pillars

- **Instant access:** no install, play in browser, guest login in seconds.
- **Atmospheric retro:** 32×32 pixel art + modern lighting, VFX, and sound.
- **Authoritative fairness:** server owns truth; no pay‑to‑win.
- **Community‑first:** scheduled play windows, Discord hub, founder perks.

---

# 3) Audience & positioning

- **Audience:** 25–45yo MMO nostalgics + pixel‑art fans + webgame explorers.
- **Positioning line:** *“Old‑school MMO, modern glow. Party up in your browser.”*

---

# 4) Scope & milestones

## 4.1 Birthday Slice (Aug 16, 2025)

**Features**

- Map: **Lower‑peninsula‑shaped** dungeon/town, 32×32 tiles; collisions in server.
- Player: spawn, WASD/arrow move, idle/walk animation placeholder.
- Combat: simple melee, damage, **respawn** at town.
- Social: **global chat**, temporary party (no buffs yet).
- Economy: NPC merchant (buy/sell potions), basic gold.
- Persistence: account/character save (name, position, inventory).
- Ops: Fly.io deploy (app name **toodeegame**), Sentry errors, basic metrics.

**Targets**

- 30–40 CCU, p95 tick < 8ms on server, p95 RTT < 120ms (same region).
- Build loads in < 5s on broadband; reconnect works.

## 4.2 Vertical Slice (3–5 weeks)

- Second zone (mini‑dungeon) with a telegraphed **boss**.
- **Ranged combat**, basic aggro AI (patrol/attack/flee), XP/level curve.
- **Inventory/loot**, vendor, simple crafting (1–2 recipes).
- **Party & chat** channels; instance overflow at 40+.
- **Lighting polish:** torches, emissive props, ambient particles.
- **Playtests**: Tue/Thu/Sun windows; founder cosmetic earned by boss clear.

## 4.3 Out of scope for demo

- Godot client, large quest system, premium **Retainers/Estates** runtime (spec is below but not implemented in the birthday slice).

---

# 5) World & art direction (32×32)

- **Tile size:** 32×32 (render scale 3× → 96×96 on 1080p).
- **Vibe:** Tibia‑style readability; Ori‑like mood via **lights, particles, bloom**, color grading.
- **Michigan‑inspired map:** island/peninsula dungeon with rocky coast, torchlit caves, crystal rooms.

**Pipeline**

- **Tiles & maps:** Tiled → JSON (`ground`, `collide`, `decor`, `lights`, `entities`).
- **Sprites:** Aseprite with layers `BASE/OUTLINE/SHADOW/LIGHTMASK`.
- **Normal maps:** SpriteIlluminator or GIMP from `LIGHTMASK`; attach in engine.
- **Atlas:** TexturePacker 2048×2048 PoT with 4px padding; paired normal atlas.

---

# 6) Gameplay systems

## 6.1 Slice systems

- **Movement:** client input → server fixed‑tick (20 Hz) authority; client interpolates.
- **Combat:** melee hitbox in front arc; i‑frames on hurt; drops gold/potions.
- **Progression:** XP from mobs; level gates minor stats (no trees yet).
- **NPC shop:** buy/sell potions, starter gear; price floors to avoid abuse.
- **Chat/party:** local/global channels; party list with member pips.
- **Persistence:** account, character, inventory snapshot on interval + logout.

## 6.2 Post‑slice roadmap (not in birthday build)

- **Ranged combat & abilities** (cone, projectile, ground telegraphs).
- **Quests v1:** templated fetch/kill with story copy.
- **Retainers & Titles (sanctioned automation):**
  - Personal workers: 2 free (+1 quest, **+1 premium QoL**), \~25% of player/hr each, diminishing returns.
  - **Estate serfs** via social **Titles** (Reeve/Bailiff/…): produce civic goods for towns/guilds; heavy diminishing returns + taxes; cosmetic prestige; **no BiS mats**.
  - Phased rollout with strict caps and sinks.

---

# 7) Tech stack (demo)

| Layer          | Choice                                                | Why                                                        |
| -------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| Client         | **Phaser 3 + TypeScript + Vite**                      | Fast web delivery, great 2D, easy polish/shaders.          |
| Netcode        | **Colyseus**                                          | Authoritative rooms, simple schema & lifecycle, fits Node. |
| Server runtime | **Node.js + TypeScript**                              | One language, quick iteration.                             |
| DB/Auth        | **Supabase (Postgres + Auth)**                        | SQL, transactions, RLS, easy email/OTP.                    |
| Cache/queues   | **Redis (Upstash)**                                   | Rate limits, cooldowns, presence, pub/sub.                 |
| Hosting        | **Fly.io** (server), **GitHub Pages** (client)        | CDN edge + painless CI.                                    |
| Assets/CDN     | **Cloudflare R2/Pages** (later)                       | Cheap, global.                                             |
| Observability  | **Sentry + structured logs (Axiom/Logtail)**          | Crash + perf insights.                                     |
| Analytics      | **PostHog**                                           | Funnels, retention, feature flags.                         |
| Content tools  | **Tiled, Aseprite, TexturePacker, SpriteIlluminator** | Fast retro pipeline.                                       |

---

# 8) Architecture

## 8.1 Networking

- **Authoritative server** at **20 Hz** fixed tick.
- Client sends **intent** (ax/ay); server integrates, clamps to collisions.
- **Delta snapshots** to clients; **interest management** by viewport/cell.
- Server owns: position, damage, XP, item creation; client predicts only start/stop.

## 8.2 World & collisions

- Server loads Tiled‑derived grid; `solid=true` on collision tiles.
- Movement clamp: reject moves into solids; later sweep by axis for sliding.

## 8.3 Persistence

- **Postgres** tables: `accounts`, `characters`, `inventories`, `items`, `drops`, `logs`.
- Upserts every 30s and on logout; transactional inventory ops.

## 8.4 Scale & capacity

- One process → one **room** target 40–60 CCU; spin **overflow** instance at 40+.
- Visible entities capped \~60; off‑screen AI sleeps.
- **Targets:** p95 RTT < 120ms; server tick budget < 8ms.

---

# 9) Content pipeline details

**Tiled**\
Layers: `ground`, `collide`, `decor`, `lights`, `entities`.\
Props: `solid=true` for collide; `light(type, radius, color, intensity)` objects on `lights`.

**Aseprite**\
Layers: `BASE`, `OUTLINE`, `SHADOW`, `LIGHTMASK`, `META` (no export).\
Tags: `idle_*`, `walk_*`, `attack_*`, `hurt`, `death` (4‑dir first).\
CLI export (example):

```
aseprite -b player.aseprite --sheet player.png --data player.json --format json-array --sheet-pack --trim --inner-padding 2
aseprite -b player.aseprite --sheet player_n.png --data player_n.json --format json-array --sheet-pack --layer LIGHTMASK
```

**Atlases**\
PoT (2048), padding 4px, pair normal atlas names to base frames in manifest.

---

# 10) Dev workflow, repos, CI/CD

**Repos (GitHub org: **``**)**

- `toodee-birthday-demo` (public) — Phaser client + Colyseus server.
- `toodee-content` (private) — sprites/tiles/maps via **Git LFS**; used as submodule.
- `toodee-godot` (private) — long‑term Godot codebase.

**Why separate:** different stacks, cleaner CI, safer licensing.

**CI/CD**

- **Server → Fly.io** (`app = "toodeegame"`), GitHub Action deploy on `main`.
- **Client → GitHub Pages** (or Vercel/Pages), GitHub Action build on `main`.
- Secrets: `FLY_API_TOKEN`, `VITE_SERVER_URL=wss://toodeegame.fly.dev`.

**Commands**

- Dev: `pnpm --filter @toodee/server dev` & `pnpm --filter @toodee/client dev`.
- Build: `pnpm build`.
- Load test (later): headless bot script spamming move/combat.

---

# 11) Observability & live ops

- **Sentry** client/server; release tags per commit.
- **Structured logs**: tick time, bytes/s, CCU, errors.
- **Analytics (PostHog)**: page → play conversion, session length, party rate.
- **Alerts:** p95 tick > 10ms for 5m; CCU > room cap → auto‑spin overflow.

---

# 12) Monetization model (fair freemium)

- **Core free**: all zones, core progression.
- **Cosmetic shop**: skins, dyes, pets, FX, emotes, housing décor. \$3–\$8 items.
- **VIP (QoL) \$5–\$9/mo**: +1 character slot, storage, monthly cosmetic, queue priority. No power.
- **Founder packs**: \$10/\$25/\$50 cosmetics + VIP time + name on wall.
- **Seasonal cosmetic pass** (optional) every 2–3 months; no stat boosts.

**Classes/Professions premium policy**

- Premium classes = **side‑grades**, not upgrades; earnable slowly in‑game.
- No exclusive DPS or faster XP; differences are playstyle/support.

---

# 13) Community & GTM

**Funnel:** Traffic → **Landing (Discord + email)** → **Play windows** → Retention via **rewards + weekly patches**.

**Assets**

- 8–12s vertical hook clip (torchlit hallway → hit → damage numbers).
- 3 screenshots (town, cave, boss).
- Key art header; press kit page.

**Channels**

- Reddit (playtest/feedback posts), Discord (events), TikTok/X/Shorts (clips), Itch.io page.

**Cadence**

- **Birthday week:** two 2‑hour windows (Fri PM, Sat AM).
- **Weeks 2–5:** 2–3 windows/week; scripted beats (elite at :30, boss at :50).
- Patch notes within 48h with a GIF.

**Incentives**

- **Founder role** + unique cosmetic for early testers.
- Referral perk (vendor discount or emote); name on town wall for top bug hunters.

---

# 14) Risks & mitigations

| Risk             | Impact              | Mitigation                                                         |
| ---------------- | ------------------- | ------------------------------------------------------------------ |
| Scope creep      | Miss birthday slice | Lock slice feature list; feature flags for extras                  |
| Net jitter/lag   | Choppy feel         | Interpolation + movement prediction only; cull entities            |
| Art time         | Low polish          | Use high‑quality placeholders; prioritize hero assets; add post‑FX |
| Server hot paths | Perf issues at CCU  | Profile early; keep tick < 8ms; pool entities                      |
| Exploits/dupes   | Economy break       | Server authority; transactional inventory; rate limits             |

---

# 15) Acceptance criteria (go/no‑go)

**Networking**

-

**Persistence**

-

**UX**

-

**Ops**

-

---

# 16) Retainers & Titles (post‑slice spec, brief)

**Goal:** Add “sanctioned botting” that’s fun and social, but optional and capped.

**Personal Workers** (account‑wide): 2 free → +1 via quest → **(+1 premium QoL) = 4** max. Yield ≈ **25%** of focused player/hr each; diminishing returns (1.0×, 0.8×, 0.6×, 0.5×). **Daily soft cap** equal to \~3 player‑hours, then −50%.

**Titles & Estate Serfs** (social): Titles grant **Estate Capacity** for civic‑output serfs (public works, décor supplies, caravan throughput). Heavy diminishing returns + taxes; prestige & cosmetics; **no BiS mats**.

**Phases**

- P1: 2 job types + Contract Board + upkeep + caps.
- P2: Incidents + optional escorts; apprentices; scout leads.
- P3: Public works, elections, heraldry, seasonal titles.

---

# 17) Open questions

- Classes for the vertical slice: start with **Warrior + Ranger** or just a single generic with melee/ranged swap?
- Art style detail: **4‑dir** or **8‑dir** on player for slice? (4‑dir recommended for time.)
- Monetization timing: include **Founder Pack** at first public window or wait one week?
- Hosting regions: primary = **ord** (US Midwest) — do we need a second region for friends abroad?

---

# 18) Appendix — Current repo & deploy

- **Server app name:** `toodeegame` on Fly.io.
- **Client hosting:** GitHub Pages (can switch to Vercel/Pages).
- **Secrets:** `FLY_API_TOKEN`, `VITE_SERVER_URL=wss://toodeegame.fly.dev`.
- **Local:** `pnpm --filter @toodee/server dev` + `pnpm --filter @toodee/client dev`.

