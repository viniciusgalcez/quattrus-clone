# Capri Gestiona UX contract

## Scope

This contract applies to authenticated operational routes. The application supports managers and collaborators reviewing indicators, targets, approvals, action plans, notifications and personal preferences.

## Shared interface rules

- The application shell owns navigation, theme, density and the global notification region.
- Runtime surface and color behavior is owned by `src/app/globals.css`; routes use semantic tokens instead of hard-coded theme colors.
- Native selects remain platform-owned controls. Their closed state follows the shared `input-field` style; no route assumes control of the system option popup.
- Native date, time and month inputs are platform-owned controls for pt-BR internal use. Server actions own parsing, validation and permission checks.
- Application forms declare `noValidate`; validation messages and business rules are owned by server actions and shared inline feedback components.
- Tables keep their document scroll owner on pages that also contain long forms. Horizontal overflow is scoped to `.table-scroll`.
- On narrow screens, dense annual, approval, portfolio and Gantt views retain their comparison layout inside a stable horizontal scroll region; forms and action bars stack rather than compress their controls.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native select with shared `input-field` closed-state styling | `UX-CONTRACT.md` and `src/app/globals.css` | Native | Browser interaction and lint/audit |
| Date | Native date/time/month inputs with server-side parsing | `UX-CONTRACT.md` and server actions | Native | Browser interaction, typecheck and tests |
| Form | Application-owned forms with `noValidate` and server action validation | `src/lib/actions.ts`, `src/lib/schemas.ts` and inline error components | Create / edit / filter / action-submit | Typecheck, tests and browser flow |
| Scrollbar | Global application stylesheet | `DESIGN.md` and `src/app/globals.css` | Geometry exceptions through `.table-scroll` | Browser visual check |
| Toast | Shared notification/status region | `src/components/PreferencesSaveStatus.tsx` and app shell feedback patterns | Success / warning / info / error | Browser interaction and accessibility tree |
| CRUD | Route-specific server actions guarded by authz and audit | `src/lib/actions.ts`, `src/lib/authz.ts` and route pages | Return / stay according to module workflow | Unit tests and manual login flow |

## Form and feedback rules

- Primary actions use the shared `btn btn-primary` treatment and retain their label while pending whenever possible.
- Server-confirmed preference changes display the shared toast, while pending state is announced in the form footer.
- Theme and density apply immediately in the current shell. The preferred start page is read by `/inicio` after the next successful sign-in.
- Failures keep the user on the current screen and preserve non-sensitive form values.
- Status uses text and values in addition to color. Empty states explain what will appear and offer a next step when one exists.

## Responsive and accessibility rules

- Small viewports use one content column; tables retain accessible horizontal scrolling rather than compressing data beyond readability.
- Keyboard focus is always visible, offset from surrounding borders, and reduced-motion preferences disable nonessential motion.
- Important controls have a visible label or an accessible name. Theme and density are personal settings and apply immediately in the current interface before being persisted.
