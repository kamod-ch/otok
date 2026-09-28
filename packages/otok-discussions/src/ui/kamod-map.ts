/**
 * Verified Kamod mapping for `@kamod-ch/otok-discussions/ui` (see installed `@kamod-ch/ui` / `@kamod-ch/icons` in app lockfile).
 *
 * | UI surface              | Kamod import                         | Notes                          |
 * | ----------------------- | ------------------------------------ | ------------------------------ |
 * | Primary actions         | `@kamod-ch/ui/button` → `Button`     | submit, link-style CTA           |
 * | Comment shell           | `@kamod-ch/ui/card` → `Card*`        | composer + login prompt        |
 * | Status / notices        | `@kamod-ch/ui/alert` → `Alert*`      | thread + error notices         |
 * | Author avatar           | `@kamod-ch/ui/avatar` → `Avatar*`    | fallback initials              |
 * | Pending badge           | `@kamod-ch/ui/badge` → `Badge`       | own pending comments           |
 * | Composer field          | `@kamod-ch/ui/textarea` → `Textarea` | SSR form                       |
 * | Agree (heart metaphor)  | `@kamod-ch/icons/lucide` → `HeartIcon`| always paired with text label |
 * | Disagree (bolt metaphor)| `@kamod-ch/icons/lucide` → `BoltIcon` | always paired with text label |
 *
 * Local compositions (no Kamod export): loading skeleton blocks, reaction `<form>` PE layout.
 */
export const DISCUSSION_UI_KAMOD_MAP = {
  button: "@kamod-ch/ui/button",
  card: "@kamod-ch/ui/card",
  alert: "@kamod-ch/ui/alert",
  avatar: "@kamod-ch/ui/avatar",
  badge: "@kamod-ch/ui/badge",
  textarea: "@kamod-ch/ui/textarea",
  icons: {
    agree: "@kamod-ch/icons/lucide#HeartIcon",
    disagree: "@kamod-ch/icons/lucide#BoltIcon",
  },
} as const;
