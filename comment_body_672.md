Implemented user-specific KYC document expiry and re-verification workflow with timezone-aware countdowns, automated restriction of high-risk actions during the final 7-day grace window, historical field preservation on fast-track renewals, and immediate reminder silencing upon submission.

Route accessible at `/kyc/reverify`. All unit, component, and surface documentation tests pass cleanly. Pull request opened: [PR pending]

### Payout Addresses:
- **Base / EVM (USDC)**: `0x53Eb00b639e3e7fD2E55faB322495d4371faB65a`
- **TRAC**: `trac1sfu7tt3nnlayu27u7hw7chhu4ctzesle3rp8lnqeu3e2ccux3pus8hckea`
- **BCH**: `bitcoincash:qr9gjzwkvghvvdyvqg8pppcvsg084pgeyvjyx3hjjc`
