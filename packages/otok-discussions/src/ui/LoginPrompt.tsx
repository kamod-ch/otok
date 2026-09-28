import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kamod-ch/ui/card";
import type { DiscussionLabels } from "./types.js";

export interface LoginPromptProps {
  labels: DiscussionLabels;
  loginHref?: string;
}

export function LoginPrompt({ labels, loginHref }: LoginPromptProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{labels.loginTitle}</CardTitle>
        <CardDescription>{labels.loginDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {loginHref ? (
          <a
            href={loginHref}
            class="inline-flex h-8 items-center justify-center rounded-md bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {labels.loginAction}
          </a>
        ) : (
          <p class="text-sm text-muted-foreground">{labels.loginDescription}</p>
        )}
      </CardContent>
    </Card>
  );
}
