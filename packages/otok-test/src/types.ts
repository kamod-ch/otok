/** Compile-time assertion that `T` extends `U`. */
export type Expect<T extends U, U> = T;

/** Compile-time assertion that `A` and `B` are identical types. */
export type AssertEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/** Expect a type to be `true`; use in conditional type tests. */
export type ExpectTrue<T extends true> = T;

/** Expect a type to be `false`; use in conditional type tests. */
export type ExpectFalse<T extends false> = T;

/** Narrow helper for asserting literal unions in tests. */
export type ExpectAssignable<T, U extends T> = U;

/** Runtime helper that asserts a value matches an expected shape without returning it. */
export function expectTypeOf<T>(_value: T): void {
  // Intentionally empty — used only for TypeScript inference in tests.
}
