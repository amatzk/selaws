type ExtraKeys<Value extends readonly unknown[]> = Value extends unknown
  ? Exclude<keyof Value, keyof (readonly [...Value])>
  : never;

/** The collector promises positional values, not arbitrary array properties. */
export type PositionArrayInput<Value extends readonly unknown[]> = true extends (
  Value extends unknown[]
    ? true
    : false
)
  ? never
  : [ExtraKeys<Value>] extends [never]
    ? unknown
    : never;
