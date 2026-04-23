/**
 * Convert a Solana wallet to a keypair JSON file usable by LayerZero devtools.
 *
 *   npx ts-node scripts/make-keypair.ts
 *
 * It will interactively ask for ONE of:
 *   1) a 12 / 24-word BIP39 mnemonic
 *   2) a base58 secret key (Phantom → Settings → Show Private Key)
 *   3) a hex secret key (0x...)
 *
 * Output: ./keys/delegate.json   (an array of 64 numbers, the standard
 *                                 Solana CLI / @solana/web3.js format)
 *
 * After it writes the file it prints the resulting public key so you can
 * confirm it matches the expected delegate
 *   CZ7DsdcWaCvLLQUHyWRPoB8QvN2PhoW74fi7oxJTh6Jg
 *
 * SECURITY
 *   • Run on a trusted machine only.
 *   • The resulting keys/delegate.json is git-ignored. Never commit, share, or
 *     store it in plain cloud storage.
 *   • Once wiring is finished, delete the file:  Remove-Item keys\delegate.json
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

import bs58 from 'bs58'
import { Keypair } from '@solana/web3.js'
import { derivePath } from 'ed25519-hd-key'
import * as bip39 from 'bip39'

const EXPECTED_PUBKEY = 'CZ7DsdcWaCvLLQUHyWRPoB8QvN2PhoW74fi7oxJTh6Jg'
const OUT_PATH = path.resolve(process.cwd(), 'keys', 'delegate.json')

// Standard Solana CLI derivation paths to try when the user supplies a mnemonic.
const DERIVATION_PATHS = [
    "m/44'/501'/0'/0'", // Solana CLI default (most common, Phantom too)
    "m/44'/501'/0'",
    "m/44'/501'/1'/0'",
    "m/44'/501'/2'/0'",
    "m/44'/501'/3'/0'",
]

function ask(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close()
            resolve(answer.trim())
        })
    })
}

function fromMnemonic(mnemonic: string): Keypair {
    if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid BIP39 mnemonic (check word count and spelling).')
    }
    const seed = bip39.mnemonicToSeedSync(mnemonic, '')

    for (const dp of DERIVATION_PATHS) {
        const derived = derivePath(dp, seed.toString('hex')).key
        const kp = Keypair.fromSeed(derived)
        if (kp.publicKey.toBase58() === EXPECTED_PUBKEY) {
            console.log(`  ✓ matched derivation path: ${dp}`)
            return kp
        }
    }

    // None of the standard paths matched the expected pubkey — fall back to the
    // very first derivation path and warn the user.
    const derived = derivePath(DERIVATION_PATHS[0], seed.toString('hex')).key
    const kp = Keypair.fromSeed(derived)
    console.warn(
        `  ⚠ none of the standard derivation paths produced ${EXPECTED_PUBKEY}.\n` +
            `    Using ${DERIVATION_PATHS[0]} → ${kp.publicKey.toBase58()}.\n` +
            `    If this is wrong, the mnemonic is from a wallet that uses a non-standard path.`
    )
    return kp
}

function fromBase58(secret: string): Keypair {
    const decoded = bs58.decode(secret)
    if (decoded.length !== 64) {
        throw new Error(`Base58 secret has ${decoded.length} bytes, expected 64.`)
    }
    return Keypair.fromSecretKey(decoded)
}

function fromHex(secret: string): Keypair {
    const clean = secret.startsWith('0x') ? secret.slice(2) : secret
    const bytes = Buffer.from(clean, 'hex')
    if (bytes.length !== 64) {
        throw new Error(`Hex secret has ${bytes.length} bytes, expected 64.`)
    }
    return Keypair.fromSecretKey(bytes)
}

async function main() {
    console.log('Solana keypair builder for the LayerZero wire pipeline')
    console.log('=======================================================')
    console.log(`Expected public key: ${EXPECTED_PUBKEY}`)
    console.log('')
    console.log('Choose input format:')
    console.log('  [1] BIP39 mnemonic (12 or 24 words)  ← Phantom, Solflare, CLI')
    console.log('  [2] Base58 secret key                ← Phantom "Show Private Key"')
    console.log('  [3] Hex secret key (0x…)')
    console.log('')

    const choice = await ask('Selection (1/2/3): ')

    let kp: Keypair
    switch (choice) {
        case '1': {
            const m = await ask('Paste mnemonic (one line, words separated by spaces):\n> ')
            kp = fromMnemonic(m)
            break
        }
        case '2': {
            const s = await ask('Paste base58 secret key:\n> ')
            kp = fromBase58(s)
            break
        }
        case '3': {
            const s = await ask('Paste hex secret key:\n> ')
            kp = fromHex(s)
            break
        }
        default:
            throw new Error(`Unknown selection: ${choice}`)
    }

    const pubkey = kp.publicKey.toBase58()

    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
    fs.writeFileSync(OUT_PATH, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 })

    console.log('')
    console.log(`✓ wrote ${OUT_PATH}`)
    console.log(`  pubkey:  ${pubkey}`)

    if (pubkey !== EXPECTED_PUBKEY) {
        console.error('')
        console.error(`✗ pubkey does NOT match the expected delegate ${EXPECTED_PUBKEY}.`)
        console.error('  Do not use this file for wiring. Re-run with the correct credentials.')
        process.exit(2)
    }

    console.log('')
    console.log(`✓ pubkey matches the expected delegate. Ready to run:  npm run wire:all`)
}

main().catch((err) => {
    console.error('')
    console.error('ERROR:', err.message ?? err)
    process.exit(1)
})
