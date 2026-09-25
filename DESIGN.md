# Capri Gestiona design context

## Direction

Internal performance cockpit for Capricórnio Têxtil S/A. The interface should feel precise, calm and useful during a results meeting: strong hierarchy, dense but breathable data, and a clear visual distinction between progress and risk.

## Visual language

- Deep navy navigation with bright blue interaction color.
- Cobalt, cyan and mint for progress; coral and amber only for attention states.
- Rounded corners stay restrained at 8-10px and repeated rows do the visual work.
- Use Sora for display labels, Inter for reading, and JetBrains Mono for values.
- Motion is short and functional: chart reveal, status pulse, hover lift and skeleton shimmer.
- Dark mode uses a blue-black control-room palette: layered navy surfaces, steel dividers, bright but restrained cobalt focus, and semantic mint, amber and coral status colors. It is a first-class theme, never a light screen with inverted text.

## Token ownership

- `src/app/globals.css` owns the runtime color tokens for both themes. `--color-surface`, `--color-surface-muted`, and `--color-surface-elevated` are the only shared surface layers.
- Product screens must consume those semantic tokens rather than fixed white or gray backgrounds, so theme changes remain complete and predictable.

## Interaction rules

- Every data-heavy view exposes a clear next action.
- Status is never conveyed by color alone; labels and values remain visible.
- Prefer compact icon actions with tooltips for repeated controls.
- Keep mobile layouts single-column and preserve stable table scrolling.
