export class OtokHttpError extends Error {
    status;
    headers;
    failure;
    constructor(status, message = "Otok request failed", headers, failure) {
        super(message);
        this.status = status;
        this.name = "OtokHttpError";
        this.headers = new Headers(headers);
        this.failure = failure;
    }
}
export function json(data, init) {
    const responseInit = typeof init === "number" ? { status: init } : init;
    const headers = new Headers(responseInit?.headers);
    if (!headers.has("content-type"))
        headers.set("content-type", "application/json; charset=utf-8");
    return new Response(JSON.stringify(data), { ...responseInit, headers });
}
export function redirect(location, status = 302) {
    if (!location)
        throw new TypeError("otok: redirect() requires a Location value.");
    if (status < 300 || status > 399)
        throw new RangeError("otok: redirect() status must be a 3xx status code.");
    throw new OtokHttpError(status, "Redirect", { location });
}
export function notFound(message = "Not found") {
    throw new OtokHttpError(404, message, undefined, { status: 404, message });
}
export function fail(first = "Internal server error", second = 500) {
    if (typeof first === "number") {
        const failure = normalizeFailure(first, second && typeof second === "object" ? second : {});
        throw new OtokHttpError(failure.status, failure.message ?? "Request failed", undefined, failure);
    }
    const status = typeof second === "number" ? second : 500;
    throw new OtokHttpError(status, first, undefined, { status, message: first });
}
function normalizeFailure(status, failure) {
    return {
        status,
        ...failure,
        fieldErrors: normalizeFieldErrors(failure.fieldErrors),
    };
}
function normalizeFieldErrors(fieldErrors) {
    if (!fieldErrors)
        return undefined;
    return Object.fromEntries(Object.entries(fieldErrors).map(([field, errors]) => [field, [...errors]]));
}
export function isOtokHttpError(error) {
    return error instanceof OtokHttpError;
}
export function isOtokResponse(value) {
    return value instanceof Response || isOtokHttpError(value);
}
//# sourceMappingURL=routes.js.map