import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kamod-ui/core";
import type { PaymentRow } from "../data/dashboard";

type PaymentsTableProps = {
  payments: PaymentRow[];
};

function statusVariant(status: PaymentRow["status"]) {
  if (status === "success") return "success" as const;
  if (status === "failed") return "destructive" as const;
  return "secondary" as const;
}

export function PaymentsTable({ payments }: PaymentsTableProps) {
  return (
    <Card class="col-span-3">
      <CardHeader>
        <CardTitle>Latest Payments</CardTitle>
        <CardDescription>See recent payments from your customers here.</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead class="hidden sm:table-cell">Email</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.email}>
                <TableCell class="font-medium">{payment.customer}</TableCell>
                <TableCell class="hidden text-muted-foreground sm:table-cell">
                  {payment.email}
                </TableCell>
                <TableCell>{payment.amount}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(payment.status)}>{payment.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
        <p class="mt-4 text-xs text-muted-foreground">0 of {payments.length} row(s) selected.</p>
      </CardContent>
    </Card>
  );
}
