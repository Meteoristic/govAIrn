
# DAO-Pilot AI — Hackathon-Focused MVP Plan
(Track: AI – On-chain Agent w/ AgentKit, Base Batches India)

## 0 North-Star Thesis — Base Edition
Be the voice of every token-holder on Base.
 DAO-Pilot AI ingests every proposal in Base-native DAOs, explains it in seconds, and casts the vote you would have chosen—autonomously, transparently, on-chain.

## 1 Hackathon Guard-rails (pulled from Base Batches brief)
| Requirement | Compliance path |
|-------------|----------------|
| "AI agent on Base that performs useful on-chain actions using AgentKit" | Proposal-analysis LLM → AgentKit castVote() or delegateBySig() on Base mainnet. |
| Public URL & open-source repo | Next.js SPA on Vercel; MIT-licensed GitHub. |
| ≥ 1 tx on Base mainnet | Demo vote on Uniswap DAO (or a test Governor) with $USDC paymaster gas. |
| Recommended: Smart Wallet & Basenames | AgentKit smart-wallet behind Passkey; optional Basename claim. |
| Demo video (≥ 1 min) | Record loom: onboarding → proposal summary → vote tx hash. |

Base Batch India

## 2 MoSCoW Prioritisation
| Priority | Feature / Task | Notes |
|----------|---------------|-------|
| Must-Have | Wallet connect (Passkey & MetaMask) via AgentKit Smart-Wallet | Gasless USDC paymaster enabled. |
| | DAO discovery (Base Governor tokens) via Tally GraphQL snapshot. | Single query + 1 RPC fallback. |
| | Proposal ingestion + AI summary (GPT-4o) with pros/cons. | RAG over proposal body; cached in Redis. |
| | Vote decision rules: default FOR unless risk flag OR user override. | Keep rules minimal for hackathon. |
| | castVote / delegateBySig execution on Base mainnet. | Simulate → send via AgentKit; show hash. |
| | Minimal dashboard: DAO grid + proposal card + "AI will vote FOR (Accept/Override)". | Tailwind + Shadcn UI. |
| Should-Have | Health Rings (turnout %, throughput). | Static calc at build time, refresh 60 s. |
| | Outcome simulator slider. | Quick JS diff of current tallies. |
| Could-Have | Undo / revoke delegation. | Extra tx; implement if time. |
| | Snapshot support (EIP-712 sign). | Off-chain only; nice-to-have. |
| Won't (now) | Multi-chain expansion, custom strategy DSL, Farcaster frame. | Post-hackathon roadmap. |

## 3 Roadmap & Step-by-Step Guide (72-hour sprint)
| T-Hour | Deliverable | Owner / Stack |
|--------|-------------|---------------|
| 0–4 | Project bootstrap | • create-agentkit-app<br>• Vercel repo, CI/CD. | Node, AgentKit, Wagmi. |
| 4–10 | DAO Scanner | • Call Tally tokenBalances.<br>• Map contracts ↔ DAO logo list (static JSON). | Python ETL → Postgres. |
| 10–18 | Proposal ETL | • Pull open proposals + bodies.<br>• Store in Postgres, index in pgvector. | Tempo cron job. |
| 18–24 | LLM Summary API | • GPT-4o call → {summary, pros, cons}.<br>• Cache 5 min in Redis. | FastAPI. |
| 24–30 | Front-End skeleton | • DAO Grid → Toggle.<br>• Proposal card modal. | Next.js, Tailwind, Framer. |
| 30–38 | Vote Engine | • Accept AI decision → build calldata.<br>• AgentKit simulate → send mainnet.<br>• USDC paymaster test. | Node microservice. |
| 38–46 | Health Rings + Simulator | D3 arcs; simple turnout calc. |
| 46–54 | Security & Rate-limits | • Allow-list Governor ABI.<br>• Daily spend cap env var. | Typescript guards. |
| 54–60 | End-to-End demo | • Record Loom.<br>• Ensure 1 vote tx on Base. | — |
| 60–68 | Polish & Docs | • README, architecture diagram.<br>• Devfolio submission form. | Markdown / Mermaid. |
| 68–72 | Buffer / Bug-fix | — |

## 4 Core Components & Repos
| Repo | Tech | Description |
|------|------|-------------|
| dao-pilot-frontend | Next.js + Wagmi + AgentKit hooks | SPA & wallet flows. |
| dao-pilot-backend | FastAPI (Python) | /summary /simulate /stats endpoints. |
| dao-pilot-etl | Tempo job scripts | Tally & Dune pulls → Postgres. |
| dao-pilot-executor | Node + AgentKit | Isolated signer service (Docker). |

## 5 Data & Model Cheat-Sheet
| Need | Source | Frequency |
|------|--------|-----------|
| DAO token balances | Tally GraphQL tokenBalances | On connect, then daily |
| Proposals meta & body | Tally proposals + Governor proposalDescription | Every 60 s |
| Current vote tallies | Governor proposalVotes RPC | On modal open (live) |
| Embeddings for RAG | OpenAI text-embedding-3-small | On new proposal |

LLM prompt (trimmed):
```css
CopyEdit
You are DAO-Pilot. Summarise in ≤120 words. List 3 pros, 3 cons from token-holder perspective.
```

## 6 Success Checklist for Submission Day
- [ ] Deployed Vercel URL with working connect / vote.
- [ ] GitHub public repos with MIT license.
- [ ] 1+ castVote tx hash on Base mainnet in README.
- [ ] 90-second demo video uploaded.
- [ ] Devfolio form filled; track = AI.
- [ ] Optional: claim Basename for demo wallet.

With this MoSCoW-driven roadmap you have a crystal-clear build order, timeboxes, and compliance hooks to ace the AI track at Base Batches while laying foundations for post-hackathon growth.

## Sources
### 1 Delegation ≠ "Delegate Profile"
TL;DR – On every major governance stack a delegate is just an EVM address.
 A "profile" (name, avatar, bio) is optional cosmetic metadata shown by Tally / Snapshot UI.

| Stack | How voting power is delegated | Does it require a "profile"? |
|-------|------------------------------|----------------------------|
| OpenZeppelin ERC20Votes / Governor-Bravo (used by Uniswap, Base, etc.) | User sends delegate(\<delegatee-address\>) or gas-free delegateBySig(...) to the token contract. The token emits an event; Governor reads that for voting power. | No. Tally will list the delegate as 0xAB…CD until they optionally publish metadata. |
| Snapshot | User signs the off-chain message: { delegate: \<delegatee\>, space: \<dao-id\>, type: "delegation" } and posts it to Snapshot Hub (IPFS). | No. Snapshot shows the raw address unless the delegate later sets a profile. |

So the agent only needs an address.
 Creating a fancy "delegate profile" can improve discoverability later, but it is not required for your MVP and not required for the delegation transaction to work.

### 2 Delegation Flow in DAO-Pilot AI (on Base)
1. User toggles "ON" for a DAO.
2. Front-end shows "Authorize delegation to DAO-Pilot" modal.
3. Two implementation paths (choose one per DAO token):

| Path | How it works | Gas | AgentKit calls |
|------|-------------|-----|---------------|
| A. delegateBySig (preferred) | User signs an EIP-712 typed-data payload → Backend (AgentKit service) submits delegateBySig tx on Base. | Gas paid by paymaster (USDC) once, minimal. | prepareTx( token, data ) → simulate → send |
| B. delegate | User's smart-wallet (AgentKit) sends on-chain tx directly. | Gas paid now (USDC paymaster) . | Same calls; payload is delegate(address). |

4. Token contract records delegatee = agentWallet.
5. From that block onward the agent wallet can cast castVote() and its vote weight equals the user's token balance (plus any other addresses that delegated to it).

(For Snapshot spaces the flow is analogous but entirely off-chain: user signs the delegation message, DAO-Pilot posts it to Snapshot Hub. No gas involved.)

### 3 Why Tally Shows "Delegate Profiles"
Tally's API createDelegateProfile endpoint lets anyone attach metadata (name, avatar, socials) to any address.

If you skip this step the delegate still receives voting power; Tally just renders the raw address.

You can add a profile later (post-hackathon) for branding.

### 4 Revised MVP Checklist (Delegation Mechanics Only)
| Step | Contract/API | AgentKit or Other | Done when… |
|------|-------------|------------------|-----------|
| Detect if token supports delegateBySig | Read DOMAIN_SEPARATOR & nonces() | ethers.js helper | Return true/false. |
| Build delegation payload | token.interface.encodeFunctionData(...) or EIP-712 struct | Backend | Signed tx object ready. |
| Simulate gas | TxHelper.simulate() | AgentKit | Gas ≤ paymaster limit. |
| Send tx | TxHelper.send() | AgentKit | Tx hash returned. |
| Persist delegation record | Emit event → read by ETL | ETL worker | Dashboard shows "Delegation active". |

### 5 Key Take-aways for the Hackathon
- You do not need to "register" the agent anywhere.
 Delegation is purely contractual or off-chain signature; profile is icing.
- AgentKit handles the execution, not discovery.
 You still pull DAO/token lists from Tally or Snapshot to know where delegation can happen.
- Gasless UX is easy: delegateBySig + AgentKit paymaster = user pays nothing and sees one confirmation dialog.

With this clarified, your build focus stays on:
1. Detect DAOs → show toggle.
2. Produce the correct delegate/delegateBySig payload.
3. Route it through AgentKit for simulation & send.
4. Cast real votes later using the same AgentKit wallet.

Everything else—proposal analysis, summaries, UI—remains unchanged from the roadmap we defined.

## DAO-Pilot AI – 0 → 1 Build Guide with "Vibe-Coding" Tools

| Build Stage | Goal | Recommended Tool | Why this tool? | Concrete Steps |
|------------|------|-----------------|---------------|---------------|
| 1. Blueprint | Write crystal-clear PRD, tech spec & MoSCoW backlog. | CodeGuide | Auto-templates for PRDs + inline GPT refinement. | 1. Create dao-pilot-prd.md with vision, North-Star, MoSCoW table.<br>2. Paste the core-feature matrix; let CodeGuide's "Spec Checker" flag ambiguities.<br>3. Export spec.pdf for team & mentors. |
| 2. Repo & infra scaffold | Spin up mono-repo, CI, cloud runtime. | Tempo (Tempo Platform) | One-command Docker infra; GPU/CPU jobs share secrets with runtime. | 1. tempo init dao-pilot → choose Python-FastAPI & Node services.<br>2. Add Postgres/Redis add-ons.<br>3. Set env secrets (OpenAI key, AgentKit key, Alchemy RPC). |
| 3. ETL Worker | Pull Base DAO data every 60 s. | Bolt (pick Bolt.new "Script" flow) | Fast one-file cron with auto-retry and email alerts. | 1. Paste sample Python ETL snippet; point to Tempo Postgres.<br>2. Bolt's inline AI suggests proper pagination for Tally GraphQL.<br>3. Schedule: */1 * * * *. |
| 4. API Gateway | /summary /simulate /stats endpoints. | Windsurf (AI pair-programming IDE) | TS/JS code-gen with real-time test hints. | 1. windsurf open api-gateway → scaffold FastAPI routers.<br>2. Use Windsurf "Ask AI" to generate OpenAPI stubs.<br>3. Validate with auto-generated pytest suite. |
| 5. LLM Kernel | Proposal summariser & decision rules. | Cursor (local VSCode+GPT coder) | Better for Python experiments & quick prompt tuning. | 1. In Cursor notebook, prototype prompt → summary function.<br>2. Plug into gateway via /summary. |
| 6. Smart-wallet executor | Delegate & castVote via AgentKit. | Windsurf again (Node) | Has TypeScript completion for web3 libs. | 1. Generate executor.ts that wraps TxHelper.<br>2. Windsurf tests simulate Base Sepolia and assert gas <150k. |
| 7. Front-End | DAO grid + proposal modal. | Lovable (lovable.dev "Web App" flow) | Drag-and-drop Figma-like UI, exports React+Tailwind. | 1. Design grid & modal visually.<br>2. Export Next.js project.<br>3. Hook Wagmi + AgentKit hooks with Windsurf AI assist. |
| 8. Motion & Charts | Health rings & slider sim. | Cursor | Write D3 + Framer code faster via inline GPT. | 1. Import @nivo/pie or D3 arc generator.<br>2. Cursor auto-fixes animation timing. |
| 9. Docs & Demo Assets | README, architecture svg, demo script. | CodeGuide again | Turn markdown to polished PDF & Mermaid diagrams. | 1. Generate architecture.mmd; CodeGuide renders SVG.<br>2. Use "Demo Script" template to outline Loom recording. |
| 10. Deploy & preview | Public URL + cron workers. | Tempo | Single tempo deploy pushes all services & cron jobs. | 1. tempo deploy --prod.<br>2. Verify health endpoints; share dev URL for judge testing. |

### Linear Timeline (48–72 h Hackathon)
- Hour 0–3 · Blueprint – CodeGuide
- 3–6 · Infra Scaffold – Tempo
- 6–12 · ETL Worker – Bolt → Tempo cron
- 12–18 · API Gateway – Windsurf backend
- 18–24 · LLM Kernel & Tests – Cursor
- 24–30 · Executor Service – Windsurf TS
- 30–40 · Front-End & Charts – Lovable export + Cursor tweaks
- 40–46 · Integration & E2E – Tempo staging URL
- 46–52 · Polish UI Motion – Cursor
- 52–60 · Docs + Demo – CodeGuide PDF, Loom record
- 60–72 · Buffer / Bug-fix / Submission

### Tool-Switch Quick Tips
| Workflow Need | Use | Shortcut |
|--------------|-----|----------|
| Generate REST boilerplate fast | Windsurf "/api new route" command palette | ⌘⇧P → Agent: new route |
| Prompt-test summaries inline | Cursor scratch pad + ⇧Enter | Saves context as .prompt.md |
| Re-deploy quickly | Tempo hot-reload | tempo dev watches & reloads |
| UI tweak w/out code | Lovable live editor | Click element → style panel |
| Spec-to-issue sync | CodeGuide "Export → Linear" | Creates backlog automatically |

### Final Reminder
- AgentKit lives only inside the executor service; keep its secrets scoped.
- Run one full mainnet delegation/vote before recording the demo video.
- Push all repos public with MIT license at least 1 h before deadline (Devfolio check).
