declare module "d3-selection" {
  export interface Selection<
    GElement extends Element,
    Datum,
    PElement extends Element,
    PDatum
  > {
    attr(name: string, value: string | number): this;
    call(
      fn: (selection: Selection<GElement, Datum, PElement, PDatum>, ...args: unknown[]) => void,
      ...args: unknown[]
    ): this;
    on(typenames: string, listener: null): this;
  }

  export function select<GElement extends Element>(element: GElement | null): Selection<GElement, unknown, null, undefined>;
}
