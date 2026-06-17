export type TeamMember = {
  name: string;
  email: string;
  role: "Viewer" | "Developer" | "Owner";
  initials: string;
};

export type PaymentRow = {
  customer: string;
  email: string;
  amount: string;
  status: "success" | "processing" | "failed";
};

export type ExerciseDay = {
  day: string;
  minutes: number;
};

export type ChatMessage = {
  author: string;
  message: string;
  isUser: boolean;
};

export const dashboardUser = {
  name: "Toby Belhome",
  email: "hello@tobybelhome.com",
  initials: "TB",
};

export const dashboardStats = {
  subscriptions: { value: 4850, change: "+180.1% from last month" },
  revenue: { value: 15231.89, change: "+20.1% from last month" },
};

export const teamMembers: TeamMember[] = [
  { name: "Toby Belhome", email: "contact@bundui.io", role: "Owner", initials: "TB" },
  { name: "Jackson Lee", email: "pre@example.com", role: "Developer", initials: "JL" },
  { name: "Hally Gray", email: "hally@site.com", role: "Viewer", initials: "HG" },
];

export const payments: PaymentRow[] = [
  { customer: "Kenneth Thompson", email: "ken99@yahoo.com", amount: "$316.00", status: "success" },
  { customer: "Abraham Lincoln", email: "abe45@gmail.com", amount: "$242.00", status: "success" },
  {
    customer: "Monserrat Rodriguez",
    email: "monserrat44@gmail.com",
    amount: "$837.00",
    status: "processing",
  },
  { customer: "Silas Johnson", email: "silas22@gmail.com", amount: "$874.00", status: "success" },
  { customer: "Carmella DeVito", email: "carmella@hotmail.com", amount: "$721.00", status: "failed" },
  { customer: "Maria Garcia", email: "maria@gmail.com", amount: "$529.00", status: "success" },
  { customer: "James Wilson", email: "james34@outlook.com", amount: "$438.00", status: "processing" },
  { customer: "Sarah Jones", email: "sarah.j@yahoo.com", amount: "$692.00", status: "success" },
];

export const exerciseMinutes: ExerciseDay[] = [
  { day: "Mon", minutes: 28 },
  { day: "Tue", minutes: 42 },
  { day: "Wed", minutes: 35 },
  { day: "Thu", minutes: 58 },
  { day: "Fri", minutes: 48 },
  { day: "Sat", minutes: 62 },
  { day: "Sun", minutes: 44 },
];

export const chatThread: ChatMessage[] = [
  { author: "Sofia Davis", message: "Hi, how can I help you today?", isUser: false },
  { author: "You", message: "Hey, I'm having trouble with my account.", isUser: true },
  { author: "Sofia Davis", message: "What seems to be the problem?", isUser: false },
  { author: "You", message: "I can't log in.", isUser: true },
];
