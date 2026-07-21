## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Shadcn Studio Pro (MCP + CLI)

Pro-Account nutzen für Blocks/Themes/MCP:

1. In `.env` setzen (nie committen): `EMAIL`, `LICENSE_KEY`  
   Die E-Mail muss die **Shadcn-Studio-Account-Mail** sein (aktuell: iCloud, nicht Gmail).
2. MCP lokal: Onboarding unter https://shadcnstudio.com/mcp/onboarding → **Cursor** wählen  
   oder `.cursor/mcp.json.example` nach `.cursor/mcp.json` kopieren und Key/E-Mail eintragen.
3. Cursor danach neu starten. Befehle: `/cui`, `/iui`, `/rui`, `/ftc`.
4. CLI-Registries stehen in `components.json` (`@ss-blocks`, `@ss-components`, `@ss-themes`).
5. MCP-Workflow-Instructions liegen unter `.github/instructions/shadcn-studio.instructions.md`
   und als Cursor-Rule unter `.cursor/rules/shadcn-studio.mdc`.

## Roadmap (Kurz)

Siehe `docs/PLANNING.md` v3. Reihenfolge: Privacy → Hilfe → Formationen → **VEO** (Phase 1).  
Ops: `rls_owner_scoped.sql`, `match_formations.sql`, `match_video.sql`, `attribute_definitions_owner.sql`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
