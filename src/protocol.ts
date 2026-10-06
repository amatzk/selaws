import type { IsUnion, Scalar, SingleScalar } from "./internal/scalar.js";

/** Scalar identifiers used as Protocol states. */
export type State = Scalar;

/** Scalar identifiers used to distinguish transitions. */
export type Label = Scalar;

/** One admissible labeled transition. */
export type Transition<
  From extends State = State,
  Via extends Label = Label,
  To extends State = State,
> = readonly [from: From, label: Via, to: To];

type IsMutableArray<Value> = Value extends unknown[] ? true : false;

type InvalidTransitionEntry<Transitions extends readonly Transition[]> = {
  [Index in keyof Transitions]: Transitions[Index] extends readonly [
    infer From extends State,
    infer Via extends Label,
    infer To extends State,
  ]
    ? [SingleScalar<From>] extends [never]
      ? Index
      : [SingleScalar<Via>] extends [never]
        ? Index
        : [SingleScalar<To>] extends [never]
          ? Index
          : never
    : Index;
}[number];

type ClosedTransitions<Transitions extends readonly Transition[]> =
  true extends IsUnion<Transitions>
    ? never
    : true extends IsMutableArray<Transitions>
      ? never
      : true extends IsMutableArray<Transitions[number]>
        ? never
        : number extends Transitions["length"]
          ? never
          : [InvalidTransitionEntry<Transitions>] extends [never]
            ? unknown
            : never;

type ExactTransitions<Transitions extends readonly Transition[]> =
  ClosedTransitions<Transitions> extends never ? never : Transitions;

type TransitionUnion<Transitions extends readonly Transition[]> =
  ExactTransitions<Transitions>[number];

type SourceOf<One> = One extends readonly [infer From extends State, Label, State]
  ? From
  : never;

type LabelOf<One> = One extends readonly [State, infer Via extends Label, State]
  ? Via
  : never;

type TargetOf<One> = One extends readonly [State, Label, infer To extends State]
  ? To
  : never;

/** All state identifiers that occur in one exact finite relation. */
export type States<Transitions extends readonly Transition[]> =
  | SourceOf<TransitionUnion<Transitions>>
  | TargetOf<TransitionUnion<Transitions>>;

/** All transition labels that occur in one exact finite relation. */
export type Labels<Transitions extends readonly Transition[]> = LabelOf<
  TransitionUnion<Transitions>
>;

type NextFrom<One, From extends State, Via extends Label> = One extends readonly [
  infer Source extends State,
  infer EdgeLabel extends Label,
  infer To extends State,
]
  ? [Source & From] extends [never]
    ? never
    : [EdgeLabel & Via] extends [never]
      ? never
      : To
  : never;

/** The statically admissible targets in one exact finite relation. */
export type Next<
  Transitions extends readonly Transition[],
  From extends States<Transitions>,
  Via extends Labels<Transitions>,
> = NextFrom<TransitionUnion<Transitions>, From, Via>;

/** Runtime membership for one exact immutable labeled transition relation. */
export type Protocol<Transitions extends readonly Transition[]> =
  ClosedTransitions<Transitions> extends never
    ? never
    : Readonly<{
        allows<
          From extends States<Transitions>,
          Via extends Labels<Transitions>,
          To extends States<Transitions>,
        >(from: From, label: Via, to: To): boolean;
      }>;

const isScalarIdentifier = (value: unknown): value is Scalar => {
  switch (typeof value) {
    case "string":
    case "number":
    case "bigint":
    case "boolean":
    case "symbol":
      return true;
    default:
      return false;
  }
};

/**
 * Defines one exact immutable admissible labeled transition relation.
 *
 * The runtime relation snapshots the supplied triples and uses SameValueZero
 * equality through Map and Set.
 */
export const define = <const Transitions extends readonly Transition[]>(
  transitions: Transitions &
    (ClosedTransitions<Transitions> extends never ? never : unknown),
): Protocol<Transitions> => {
  if (!Array.isArray(transitions)) {
    throw new TypeError("Protocol declarations must be arrays.");
  }

  const relation = new Map<State, Map<Label, Set<State>>>();
  const length = transitions.length;

  for (let index = 0; index < length; index += 1) {
    if (!Object.hasOwn(transitions, index)) {
      throw new TypeError("Protocol declarations must contain own transition entries.");
    }

    const transition = transitions[index] as unknown;

    if (
      !Array.isArray(transition) ||
      transition.length !== 3 ||
      !Object.hasOwn(transition, 0) ||
      !Object.hasOwn(transition, 1) ||
      !Object.hasOwn(transition, 2)
    ) {
      throw new TypeError(
        "Protocol transitions must be own [from, label, to] triples.",
      );
    }

    const from = transition[0];
    const label = transition[1];
    const to = transition[2];

    if (
      !isScalarIdentifier(from) ||
      !isScalarIdentifier(label) ||
      !isScalarIdentifier(to)
    ) {
      throw new TypeError("Protocol states and labels must be scalar identifiers.");
    }

    let labels = relation.get(from);

    if (labels === undefined) {
      labels = new Map<Label, Set<State>>();
      relation.set(from, labels);
    }

    let targets = labels.get(label);

    if (targets === undefined) {
      targets = new Set<State>();
      labels.set(label, targets);
    }

    targets.add(to);
  }

  return Object.freeze({
    allows<
      From extends States<Transitions>,
      Via extends Labels<Transitions>,
      To extends States<Transitions>,
    >(from: From, label: Via, to: To): boolean {
      return relation.get(from)?.get(label)?.has(to) ?? false;
    },
  }) as Protocol<Transitions>;
};

type ProtocolFacade = Readonly<{
  define: typeof define;
}>;

/** Exact finite admissible labeled transition relations. */
export const Protocol: ProtocolFacade = {
  define,
};
