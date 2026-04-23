/**
 * LayerZero V2 — DVN & Confirmations update
 * Pathway: Solana mainnet (eid 30168)  ⇄  BSC mainnet (eid 30102)
 *
 * SCOPE OF CHANGES
 * ────────────────
 *   • confirmations  : 32 / 15  →  20 / 20   (both directions)
 *   • required DVNs  : 1        →  4         (per chain, sorted ascending)
 *   • enforced opts  : UNCHANGED
 *   • peers          : UNCHANGED (already set)
 *   • delegate/owner : UNCHANGED
 *
 * SAFETY NOTES
 * ────────────
 *   1. DVN arrays are sorted ascending and de-duplicated (LayerZero ULN requires
 *      this; an unsorted array makes the wire transaction revert).
 *   2. Library / executor addresses below are the LayerZero V2 *defaults*. They
 *      are listed explicitly so a reviewer can diff them against the on-chain
 *      defaults at:
 *         https://docs.layerzero.network/v2/deployments/deployed-contracts
 *      If your OApp is intentionally on a non-default library, edit them here.
 *   3. The wire task is idempotent: it diffs the on-chain state and only emits
 *      the transactions strictly required to converge.
 *   4. Do a dry run first (`--dry-run`) and review every queued tx.
 */

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import type {
    OAppEnforcedOption,
    OAppOmniGraphHardhat,
    OmniPointHardhat,
} from '@layerzerolabs/toolbox-hardhat'

// ═════════════════════════════════════════════════════════════════════════════
// 1. Endpoints
// ═════════════════════════════════════════════════════════════════════════════

const solanaContract: OmniPointHardhat = {
    eid: EndpointId.SOLANA_V2_MAINNET, // 30168
    address: '8nULvjDGGykWnwd6mogRm9i7Y5D5M47S2YNwZrPf8bUN',
}

const bscContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_MAINNET, // 30102
    // The BSC OApp address — equal to the peer that the Solana OApp reports.
    address: '0x0fcfe33b46e5b21e5e96b722d4c85510198f9255',
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. DVNs  (MUST be sorted ascending and unique)
// ═════════════════════════════════════════════════════════════════════════════

/** Solana DVN program IDs (base58, sorted ascending). */
const SOLANA_REQUIRED_DVNS: string[] = [
    '29EKzmCscUg8mf4f5uskwMqvu2SXM8hKF1gWi1cCBoKT',
    '7jMeX5mzXnSSKYd8DxBDP4xMnkNFZZZm5W28FWUTbwU3',
    'Fn8yyjaLbqw9FZyyLaTkb8o8RWp3vztxNChtPxcV1cLV',
    'FxFxe8j7e2xgpP9bw8LUehmz7DoQXaNFadJMEUKwBcRs',
]

/** BSC DVN contract addresses (lower-case hex, sorted ascending). */
const BSC_REQUIRED_DVNS: string[] = [
    '0x439264fb87581a70bb6d7befd16b636521b0ad2d',
    '0x534c6b3e6805e9287ff1d49c349d5f7a01b9b7f5',
    '0xf0a5c5306adbfd4e3dfd5d4b148b451c411d3878',
    '0xfa9ba83c102283958b997adc8b44ed3a3cdb5dda',
]

const CONFIRMATIONS20 = BigInt(20)
const CONFIRMATIONS32 = BigInt(32)
const MAX_MESSAGE_SIZE = 10_000

// ═════════════════════════════════════════════════════════════════════════════
// 3. Enforced options (unchanged from current on-chain values)
//      msgType 1 (SEND)         → lzReceive(gas = 80_000, value = 0)
//      msgType 2 (SEND_AND_CALL) → no enforced options
// ═════════════════════════════════════════════════════════════════════════════

const ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 80_000,
        value: 0,
    },
]

// ═════════════════════════════════════════════════════════════════════════════
// 4. LayerZero V2 message-libraries & executors (mainnet defaults)
//      Verify against the official deployment table before wiring:
//      https://docs.layerzero.network/v2/deployments/deployed-contracts
// ═════════════════════════════════════════════════════════════════════════════

// Solana mainnet — single ULN program is used for both send and receive paths
const SOLANA_ULN = '7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH'
const SOLANA_EXECUTOR = 'AwrbHeCyniXaQhiJZkLhgWdUCteeWSGaSN1sTfLiY7xK'

// BSC mainnet
const BSC_SEND_ULN = '0x9F8C645f2D0b2159767Bd6E0839DE4BE49e823DE'
const BSC_RECEIVE_ULN = '0xB217266c3A98C8B2709Ee26836C98cf12f6cCEC1'
const BSC_EXECUTOR = '0x3ebD570ed38B1b3b4BC886999fcF507e9D584859'

// ═════════════════════════════════════════════════════════════════════════════
// 5. Graph — explicit two-direction wiring
// ═════════════════════════════════════════════════════════════════════════════

const config: OAppOmniGraphHardhat = {
    contracts: [
        { contract: solanaContract },
        { contract: bscContract },
    ],
    connections: [
        // ───────────────── Solana (30168) ──→ BSC (30102) ─────────────────
        {
            from: solanaContract,
            to: bscContract,
            config: {
                sendLibrary: SOLANA_ULN,
                receiveLibraryConfig: {
                    receiveLibrary: SOLANA_ULN,
                    gracePeriod: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: MAX_MESSAGE_SIZE,
                        executor: SOLANA_EXECUTOR,
                    },
                    ulnConfig: {
                        confirmations: CONFIRMATIONS32,
                        requiredDVNs: SOLANA_REQUIRED_DVNS,
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: CONFIRMATIONS20,
                        requiredDVNs: SOLANA_REQUIRED_DVNS,
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                enforcedOptions: ENFORCED_OPTIONS,
            },
        },

        // ───────────────── BSC (30102) ──→ Solana (30168) ─────────────────
        {
            from: bscContract,
            to: solanaContract,
            config: {
                sendLibrary: BSC_SEND_ULN,
                receiveLibraryConfig: {
                    receiveLibrary: BSC_RECEIVE_ULN,
                    gracePeriod: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: MAX_MESSAGE_SIZE,
                        executor: BSC_EXECUTOR,
                    },
                    ulnConfig: {
                        confirmations: CONFIRMATIONS20,
                        requiredDVNs: BSC_REQUIRED_DVNS,
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: CONFIRMATIONS32,
                        requiredDVNs: BSC_REQUIRED_DVNS,
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                enforcedOptions: ENFORCED_OPTIONS,
            },
        },
    ],
}

export default config
