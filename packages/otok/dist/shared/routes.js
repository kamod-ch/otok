export class OtokHttpError extends Error {
    status;
    headers;
    constructor(status, message = "Otok request failed", headers) {
        super(message);
        this.status = status;
        this.name = "OtokHttpError";
        this.headers = new Headers(headers);
    }
}
export function redirect(location, status = 302) {
    throw new OtokHttpError(status, "Redirect", { location });
}
export function notFound(message = "Not found") {
    throw new OtokHttpError(404, message);
}
export function fail(message = "Internal server error", status = 500) {
    throw new OtokHttpError(status, message);
}
export function isOtokHttpError(error) {
    return error instanceof OtokHttpError;
}
//# sourceMappingURL=routes.js.map