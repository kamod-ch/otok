import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  RadioGroup,
  SelectableCard,
} from "@kamod-ui/core";

export default function PaymentForm() {
  return (
    <Card class="col-span-4 lg:col-span-7">
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
        <CardDescription>Add a new payment method to your account.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <RadioGroup defaultValue="card" class="grid gap-3 sm:grid-cols-3">
          <SelectableCard value="card">
            <span class="text-sm font-medium">Card</span>
          </SelectableCard>
          <SelectableCard value="paypal">
            <span class="text-sm font-medium">Paypal</span>
          </SelectableCard>
          <SelectableCard value="apple">
            <span class="text-sm font-medium">Apple</span>
          </SelectableCard>
        </RadioGroup>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2 sm:col-span-2">
            <Label for="payment-name">Name on the card</Label>
            <Input id="payment-name" placeholder="John Doe" autoComplete="off" />
          </div>
          <div class="space-y-2">
            <Label for="payment-city">City</Label>
            <Input id="payment-city" placeholder="Zurich" autoComplete="off" />
          </div>
          <div class="space-y-2">
            <Label for="payment-card">Card number</Label>
            <Input id="payment-card" placeholder="1234 5678 9012 3456" autoComplete="off" />
          </div>
          <div class="space-y-2">
            <Label for="payment-expires">Expires</Label>
            <Input id="payment-expires" placeholder="MM / YY" autoComplete="off" />
          </div>
          <div class="space-y-2">
            <Label for="payment-cvc">CVC</Label>
            <Input id="payment-cvc" placeholder="123" autoComplete="off" />
          </div>
        </div>

        <Button>Continue</Button>
      </CardContent>
    </Card>
  );
}
