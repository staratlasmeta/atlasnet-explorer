# Bundled StarFrame IDLs

`sources.json` records the exact Programs commit, source paths, and SHA-256 of
each unmodified generated IDL. All four snapshots were checked against Programs
main at `70cb8d6906a2ec11088cd5afbe118a96d3d285da`. Only SAGE changed in this
refresh: 332 instructions (79 additions), 98 accounts, 222 defined types and
35 updated instruction account lists. Additions cover Scanning V2, XP budgets
and migration, and Democracy/PTR operations. The other three snapshots are
byte-identical to the previous refresh.

The parallel and HYE SAGE addresses come from `PHASE3_PROGRAM_ID` and
`HYE_PROGRAM_ID` in `programs/sage/src/lib.rs` at that same commit; both share
the instruction ABI. This registry does not determine which program release
was deployed at a particular slot.

## Historical instructions

The compatibility registry retains two earlier generations, without changing
their discriminators or rewriting historical account positions:

-   `sage-legacy-instructions.json`: the original 20 layouts from the specified
    Explorer commit, with documentation removed. The two fleet-admin instructions
    lack the subsequently appended `gameAdminKeyIndex`.
-   `sage-legacy-instructions-181e8ad6.json`: 35 layouts from the previous pinned
    Programs snapshot, also with documentation removed. This includes intermediate
    layouts for instructions already present in the older compatibility set (for
    example, crafting completion has known 12-, 13- and now 19-account forms).

Their argument types remain wire-compatible with the current defined types.
The only existing defined-type wire change in this refresh is an additive
`scanPatternStatus.removed` enum variant; existing discriminants are unchanged.

For these instructions, a shorter account list must match exactly one historical
count and the payload must decode completely. The UI explicitly labels that
previous layout. Other short counts and invalid historical payloads render
raw numbered accounts instead of guessing names or enrichment addresses. A
malformed current-size payload never falls back to the previous layout. Optional
account placeholders retain their positions.

This recognizes the current and both previously bundled full account lists, not an
exhaustive history of deployments. Account count is a layout heuristic, not proof
of execution against a particular release. Arbitrary old transactions with extra
remaining accounts cannot be versioned from their discriminator alone.

The frozen SDK fixtures in `../../__tests__/fixtures/starframe-main-70cb8d69.json`
exercise all 114 added/changed instructions, including account order and decoded
arguments. The `starframe-main-181e8ad6.json` fixtures remain unchanged to check
older payloads, admin arguments and the recovery fee field. Additional tests cover
both historical generations, HYE, malformed payloads and unknown account counts.
The decoder keeps its strict truncation/trailing-byte checks and existing combat
v1/v2/v3 coverage.
