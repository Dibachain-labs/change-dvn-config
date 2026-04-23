import 'dotenv/config'
import '@layerzerolabs/toolbox-hardhat'
import type { HardhatUserConfig } from 'hardhat/config'
import { EndpointId } from '@layerzerolabs/lz-definitions'

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? ''
const RPC_URL_BSC = process.env.RPC_URL_BSC ?? 'https://bsc-dataseed.bnbchain.org'
const RPC_URL_SOLANA = process.env.RPC_URL_SOLANA ?? 'https://api.mainnet-beta.solana.com'

const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : []

const config: HardhatUserConfig = {
    solidity: {
        compilers: [{ version: '0.8.22', settings: { optimizer: { enabled: true, runs: 200 } } }],
    },
    networks: {
        'bsc-mainnet': {
            eid: EndpointId.BSC_V2_MAINNET,
            url: RPC_URL_BSC,
            accounts,
        },
        'solana-mainnet': {
            eid: EndpointId.SOLANA_V2_MAINNET,
            url: RPC_URL_SOLANA,
            // Solana signing is handled by @layerzerolabs/devtools-solana via SOLANA_KEYPAIR_PATH (.env)
            accounts: [],
        },
    },
    namedAccounts: {
        deployer: { default: 0 },
    },
}

export default config
