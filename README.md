# Mansory OApp — DVN & Confirmations Update

> **Pathway:** Solana mainnet (eid `30168`) ⇄ BSC mainnet (eid `30102`)
> **One command does it all:** `npm run wire`

---

## Step-by-step (do this in order)

### 1. Install dependencies
```powershell
npm install --legacy-peer-deps
```

### 2. Configure the BSC signer
```powershell
copy .env.example .env
notepad .env
```
Fill in `PRIVATE_KEY=` with the **private key of the address that is set as
delegate on the BSC Endpoint for this OApp**. (Verify with `npm run config:get`
after install if unsure.)

### 3. Provide the Solana delegate keypair
The wire task needs a JSON keypair file at `./keys/delegate.json` whose public
key equals **`CZ7DsdcWaCvLLQUHyWRPoB8QvN2PhoW74fi7oxJTh6Jg`**.

Pick **one** of the options below.

#### 3a. You already have the keypair JSON
Just copy it:
```powershell
mkdir keys
copy <path-to-existing-keypair.json> keys\delegate.json
```

#### 3b. You only have a 12 / 24-word mnemonic OR a Phantom-style secret key
Use the included helper:
```powershell
npm run keypair
```
It will ask you to choose the input format and paste:
- a BIP39 mnemonic (12 or 24 words), **or**
- a base58 secret key (Phantom → Settings → Manage Accounts → Show Private Key), **or**
- a hex secret key.

It writes `keys/delegate.json` with `0o600` permissions and verifies the
resulting public key equals the expected delegate. If the pubkey does NOT
match, the script exits with a non-zero code and you must NOT proceed.

#### 3c. You don't have the keys at all
Stop. Ask the developer who originally deployed the Solana OApp — only that
person can produce a keypair for `CZ7Dsdc…h6Jg`. **Do not** receive the file by
email/Telegram/Slack; use a secure channel and delete it after wiring.

### 4. Sanity check
```powershell
npm run config:get
```
Confirms the script can talk to both endpoints and prints the current values.

### 5. Dry-run
```powershell
npm run wire:dry
```
Review every queued transaction. Required DVNs must match the lists in this
README; confirmations must be `20`; enforced options should not appear (they
are unchanged).

### 6. Execute
```powershell
npm run wire
```
Both chains are wired in this single command:
- BSC: `setSendConfig` + `setReceiveConfig` (signed with `PRIVATE_KEY`).
- Solana: equivalent ULN/Executor instructions (signed with the keypair file).

### 7. Verify
```powershell
npm run config:get
```
Diff the output against [reference/solana.uln.config.json](reference/solana.uln.config.json)
and [reference/bsc.uln.config.json](reference/bsc.uln.config.json). Every value
must match.

### 8. Clean up secrets
```powershell
Remove-Item .\keys\delegate.json
```
(Or move it back to a vault. Do not leave it on disk.)

---

## Or: one-shot

If you trust the dry-run output enough to chain everything:
```powershell
npm run wire:all
```
This runs `config:get → wire:dry → wire → config:get` and stops on the first
error.

---

## What gets changed

|  | Before | After |
|---|---|---|
| Solana → BSC `confirmations` | 32 | **20** |
| BSC → Solana `confirmations` | 15 | **20** |
| Solana required DVN count   | 1   | **4** |
| BSC required DVN count      | 1   | **4** |
| Optional DVNs / threshold   | 0/0 | 0/0 (unchanged) |
| Enforced options            | 80k gas / msgType 1; none / msgType 2 | **unchanged** |
| Peers, owner, delegate      | set | **unchanged** |

### Required DVN sets (already sorted ascending)

**Solana** (base58)
```
29EKzmCscUg8mf4f5uskwMqvu2SXM8hKF1gWi1cCBoKT
7jMeX5mzXnSSKYd8DxBDP4xMnkNFZZZm5W28FWUTbwU3
Fn8yyjaLbqw9FZyyLaTkb8o8RWp3vztxNChtPxcV1cLV
FxFxe8j7e2xgpP9bw8LUehmz7DoQXaNFadJMEUKwBcRs
```

**BSC** (lower-case hex)
```
0x439264fb87581a70bb6d7befd16b636521b0ad2d
0x534c6b3e6805e9287ff1d49c349d5f7a01b9b7f5
0xf0a5c5306adbfd4e3dfd5d4b148b451c411d3878
0xfa9ba83c102283958b997adc8b44ed3a3cdb5dda
```

---

## Files in this package

| File | Role |
|---|---|
| [layerzero.config.ts](layerzero.config.ts) | **Source of truth** — both directions defined explicitly. |
| [hardhat.config.ts](hardhat.config.ts) | Networks: `bsc-mainnet`, `solana-mainnet`. |
| [package.json](package.json) | Pinned LZ devtools versions + npm scripts. |
| [tsconfig.json](tsconfig.json) | TypeScript config. |
| [.env.example](.env.example) | Secret template. |
| [.gitignore](.gitignore) | Keeps `.env` and `keys/` out of git. |
| [reference/solana.uln.config.json](reference/solana.uln.config.json) | Audit snapshot of target Solana ULN/Executor. |
| [reference/bsc.uln.config.json](reference/bsc.uln.config.json) | Audit snapshot of target BSC ULN. |

---

## Identities (already configured in `layerzero.config.ts`)

| Role | Address |
|---|---|
| Solana OApp | `8nULvjDGGykWnwd6mogRm9i7Y5D5M47S2YNwZrPf8bUN` |
| BSC OApp (= Solana-side peer for eid 30102) | `0x0fcfe33b46e5b21e5e96b722d4c85510198f9255` |
| Solana owner / delegate | `CZ7DsdcWaCvLLQUHyWRPoB8QvN2PhoW74fi7oxJTh6Jg` |

---

## Security checklist (do not skip)

- [ ] **No secrets committed.** `.env` and `keys/` are git-ignored — verify before any push.
- [ ] **Use the actual delegate keys.** Solana keypair pubkey == `CZ7Dsdc…h6Jg`. BSC `PRIVATE_KEY` == address currently set as delegate on the BSC Endpoint for this OApp (verify with `npm run config:get`).
- [ ] **Library + executor addresses verified** against the official table at <https://docs.layerzero.network/v2/deployments/deployed-contracts>.
- [ ] **DVN addresses verified** against <https://layerzero.network/dvn>.
- [ ] **DVN arrays sorted ascending and unique** — already the case here; ULN reverts otherwise.
- [ ] **Quorum awareness:** with `requiredDVNs.length = 4` and optional threshold 0, **all 4** DVNs must verify each message. Any DVN outage halts the pathway. Move some to `optionalDVNs` with `optionalDVNThreshold = N` if you want partial-availability.
- [ ] **Always run `wire:dry` first** and have a second engineer review the queued tx batch before `wire`.
- [ ] **Re-fetch on-chain config after wiring** and diff against `reference/*.json`.

---

## Troubleshooting

### `npm install` fails with `ERR_SSL_CIPHER_OPERATION_FAILED`
That is a network/TLS issue (typically a VPN/AV doing TLS interception). Workarounds:
```bash
# Option A: switch to a stable mirror
npm config set registry https://registry.npmmirror.com
npm install --legacy-peer-deps
npm config set registry https://registry.npmjs.org/

# Option B: use pnpm (more resilient)
npm i -g pnpm
pnpm install
```

### `npm install` peer-dep conflicts
Always use `--legacy-peer-deps` (LayerZero's monorepo has loose peer pins):
```bash
npm install --legacy-peer-deps
```

### Wire task says "delegate is not set"
Ensure the keypair / private key in `.env` matches the on-chain delegate for the OApp on that endpoint. Run `npm run config:get` to see who the current delegate is.

### Need to roll back
Edit `layerzero.config.ts` back to the previous values (1 LZ Labs DVN, 32/15 confirmations) and run `npm run wire` again.
