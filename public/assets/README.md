# Spincore Art Slots

The current game uses generated placeholder art. Future production assets can
replace those visuals without changing gameplay geometry.

- `ui/`: scoreboard panels, badges, icons, and type treatments
- `court/`: court tiles, markings, arena shell, and goal presentation
- `players/`: chibi athlete sprite sheets and role variants
- `sticks/`: cesta-bat style sprites and effects
- `crowd/`: audience, bench, coach, and official sprites

Keep physics bodies, cradle zones, sockets, goal planes, and keeper boundaries
defined in code. Art should follow those systems rather than define them.

See `docs/art-direction/asset-pipeline.md` for the supported override filenames,
sprite dimensions, anchors, and fallback behavior.
