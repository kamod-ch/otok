import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@kamod-ui/core";
import { Island } from "otok/client";
import { ExerciseChart } from "../components/exercise-chart";
import { PaymentsTable } from "../components/payments-table";
import { StatCard } from "../components/stat-card";
import {
  chatThread,
  dashboardStats,
  exerciseMinutes,
  payments,
  teamMembers,
} from "../data/dashboard";
import ChatCard from "../islands/chat-card";
import Counter from "../islands/counter";
import PaymentForm from "../islands/payment-form";
import TeamMembers from "../islands/team-members";

export const loader = async () => ({
  initialCount: 5,
  dateRange: { from: "12 May 2026", to: "08 Jun 2026" },
  teamMembers,
  payments,
  exerciseMinutes,
  chatThread,
  stats: dashboardStats,
});

export const head = () => ({
  title: "Dashboard | Otok Playground",
  description: "Shadcn-style admin dashboard built with Otok SSR and kamod-ui islands.",
  links: [{ rel: "canonical", href: "https://example.com/" }],
  meta: {
    "og:title": "Otok Playground Dashboard",
    "og:type": "website",
  },
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Otok Playground",
    applicationCategory: "DeveloperApplication",
  },
});

type HomeData = Awaited<ReturnType<typeof loader>>;

export default function Home({ data }: { data: HomeData }) {
  const revenue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(data.stats.revenue.value);

  return (
    <div class="grid gap-4 lg:grid-cols-7">
      <Island component={TeamMembers} props={{ members: data.teamMembers }} strategy="visible" rootMargin="160px" />

      <div class="col-span-3 flex flex-col gap-4">
        <StatCard
          title="Subscriptions"
          value={`+${data.stats.subscriptions.value.toLocaleString()}`}
          change={data.stats.subscriptions.change}
        />
        <StatCard title="Total Revenue" value={revenue} change={data.stats.revenue.change} />
        <Island
          component={ChatCard}
          props={{
            contactName: "Sofia Davis",
            contactEmail: "m@example.com",
            contactInitials: "SD",
            messages: data.chatThread,
          }}
          strategy="visible"
          rootMargin="160px"
        />
      </div>

      <ExerciseChart data={data.exerciseMinutes} />
      <PaymentsTable payments={data.payments} />

      <Island component={PaymentForm} props={{}} strategy="visible" rootMargin="160px" />

      <Card class="col-span-4 lg:col-span-3">
        <CardHeader>
          <CardTitle>Otok island demo</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <Island component={Counter} props={{ init: data.initialCount }} />
          <div class="flex flex-wrap gap-2">
            <Button href="/about" variant="outline" size="sm">
              Zero-JS route
            </Button>
            <Button href="/demo" variant="outline" size="sm">
              kamod-ui islands
            </Button>
            <Badge variant="secondary">SSR + islands</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
