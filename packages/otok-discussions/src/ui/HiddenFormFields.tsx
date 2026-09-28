import { CSRF_FIELD } from "@kamod-ch/otok-auth/csrf";
import { OTOK_IDEMPOTENCY_FIELD } from "@kamod-ch/otok/shared";

export function HiddenFormFields(props: { csrfToken?: string; idempotencyKey?: string }) {
  return (
    <>
      {props.csrfToken ? <input type="hidden" name={CSRF_FIELD} value={props.csrfToken} /> : null}
      {props.idempotencyKey ? (
        <input type="hidden" name={OTOK_IDEMPOTENCY_FIELD} value={props.idempotencyKey} />
      ) : null}
    </>
  );
}
