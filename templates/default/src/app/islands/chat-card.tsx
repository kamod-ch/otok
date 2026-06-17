import {
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@kamod-ui/core";
import { useState } from "preact/hooks";
import type { ChatMessage } from "../data/dashboard";

type ChatCardProps = {
  contactName: string;
  contactEmail: string;
  contactInitials: string;
  messages: ChatMessage[];
};

export default function ChatCard({
  contactName,
  contactEmail,
  contactInitials,
  messages: initialMessages,
}: ChatCardProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { author: "You", message: text, isUser: true }]);
    setDraft("");
  };

  return (
    <Card>
      <CardHeader class="flex flex-row items-center gap-3 space-y-0 pb-3">
        <Avatar size="sm">
          <AvatarFallback>{contactInitials}</AvatarFallback>
        </Avatar>
        <div class="min-w-0">
          <CardTitle class="text-base">{contactName}</CardTitle>
          <p class="truncate text-xs text-muted-foreground">{contactEmail}</p>
        </div>
        <span class="ms-auto text-xs text-muted-foreground">New message</span>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="max-h-48 space-y-3 overflow-y-auto rounded-md border bg-muted/20 p-3">
          {messages.map((message, index) => (
            <div
              key={`${message.author}-${index}`}
              class={`text-sm ${message.isUser ? "text-end" : "text-start"}`}
            >
              <p
                class={`inline-block rounded-lg px-3 py-2 ${
                  message.isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {message.message}
              </p>
            </div>
          ))}
        </div>
        <div class="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={draft}
            onInput={(event) => setDraft((event.currentTarget as HTMLInputElement).value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                send();
              }
            }}
          />
          <Button onClick={send}>Send</Button>
        </div>
      </CardContent>
    </Card>
  );
}
