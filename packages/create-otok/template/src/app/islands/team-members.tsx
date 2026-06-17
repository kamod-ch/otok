import {
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kamod-ui/core";
import type { TeamMember } from "../data/dashboard";

type TeamMembersProps = {
  members: TeamMember[];
};

const roles = ["Viewer", "Developer", "Owner"] as const;

export default function TeamMembers({ members }: TeamMembersProps) {
  return (
    <Card class="col-span-4">
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>Invite your team members to collaborate.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        {members.map((member) => (
          <div key={member.email} class="flex items-center justify-between gap-4">
            <div class="flex min-w-0 items-center gap-3">
              <Avatar size="sm">
                <AvatarFallback>{member.initials}</AvatarFallback>
              </Avatar>
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{member.name}</p>
                <p class="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>
            </div>
            <Select defaultValue={member.role}>
              <SelectTrigger class="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <Button variant="outline" size="sm" class="w-full">
          Invite Members
        </Button>
      </CardContent>
    </Card>
  );
}
