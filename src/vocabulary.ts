import {
  type IsUnion,
  isScalar,
  type Scalar,
  type SingleScalar,
} from "./internal/scalar.js";

type InvalidMember<Members extends readonly Scalar[]> = {
  [Index in keyof Members]: [SingleScalar<Members[Index]>] extends [never]
    ? Index
    : never;
}[number];

type ExactMembers<Members extends readonly Scalar[]> =
  true extends IsUnion<Members>
    ? never
    : Members extends unknown[]
      ? never
      : number extends Members["length"]
        ? never
        : [InvalidMember<Members>] extends [never]
          ? unknown
          : never;

/** One finite scalar vocabulary, independent of nominal identity or a relation. */
export interface Vocabulary<Members extends readonly Scalar[]> {
  // The false branch of has() would be unsound after widening the member set.
  readonly "~selaws.vocabulary.members"?: (members: Members) => Members;
  readonly values: readonly [...Members];
  /** Tests exact membership; both branches use the same immutable snapshot. */
  readonly has: (value: unknown) => value is Members[number];
}

/**
 * Snapshots a finite tuple of distinct scalar values.
 * Duplicate values are a declaration error. Membership uses SameValueZero.
 */
export const define = <const Members extends readonly Scalar[]>(
  members: Members & ExactMembers<Members>,
): Vocabulary<Members> => {
  if (!Array.isArray(members)) {
    throw new TypeError("Vocabulary declarations must be arrays.");
  }
  const values: Scalar[] = [];
  const set = new Set<unknown>();
  const length = members.length;
  for (let index = 0; index < length; index += 1) {
    if (!Object.hasOwn(members, index)) {
      throw new TypeError("Vocabulary declarations must contain own members.");
    }
    const value: unknown = members[index];
    if (!isScalar(value)) {
      throw new TypeError("Vocabulary members must be scalar values.");
    }
    if (set.has(value)) {
      throw new TypeError("Vocabulary members must be unique.");
    }
    set.add(value);
    values.push(value);
  }

  return Object.freeze({
    values: Object.freeze(values) as unknown as readonly [...Members],
    has: (value: unknown): value is Members[number] => set.has(value),
  });
};

type VocabularyFacade = Readonly<{ define: typeof define }>;

/** Exact finite scalar vocabularies. */
export const Vocabulary: VocabularyFacade = Object.freeze({ define });
