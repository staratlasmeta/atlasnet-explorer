# Bundled StarFrame IDLs

`sources.json` records the exact Programs commit, source paths, and SHA-256 of
each unmodified generated IDL. All four snapshots were checked against Programs
main at `181e8ad670d15dae3bf8268586a65dd7353e7dba`. Only SAGE changed in this
refresh: 253 instructions, including 14 additions, and the canonical
`miscStats.recoveryFee` field name. The other three snapshots are byte-identical.

The parallel SAGE address comes from `PHASE3_PROGRAM_ID` in
`programs/sage/src/lib.rs` at that same commit; it shares the instruction ABI.
This is registry support, not a claim about deployment status at that address.

## Historical instructions

Twenty instruction account lists changed without changing their discriminators.
`sage-legacy-instructions.json` retains those previous definitions from the
specified Explorer commit, with documentation removed. Their argument types
remain wire-compatible with the current defined types; the two fleet-admin
instructions lack the newly appended `gameAdminKeyIndex`.

For these instructions, a shorter account list must match the exact previous
count and the payload must decode completely. The UI explicitly labels that
previous layout. Other short counts and invalid previous-layout payloads render
raw numbered accounts instead of guessing names or enrichment addresses. A
malformed current-size payload never falls back to the previous layout. Optional
account placeholders retain their positions.

This recognizes the current and previously bundled full account lists, not an
exhaustive history of deployments. Account count is a layout heuristic, not proof
of execution against a particular release. Arbitrary old transactions with extra
remaining accounts cannot be versioned from their discriminator alone.

The frozen SDK fixtures in `../../__tests__/fixtures/starframe-main-181e8ad6.json`
exercise the added instructions, changed account lists, admin arguments, and
renamed recovery fee using bytes from the pinned Programs SDK. The decoder keeps
its strict truncation/trailing-byte checks and existing combat v1/v2/v3 coverage.
