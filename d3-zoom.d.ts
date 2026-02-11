declare module "d3-zoom" {
  import type { Selection } from "d3-selection";

  export interface ZoomTransform {
    x: number;
    y: number;
    k: number;
    applyX(x: number): number;
    applyY(y: number): number;
    apply(point: [number, number]): [number, number];
    invertX(x: number): number;
    invertY(y: number): number;
    invert(point: [number, number]): [number, number];
    scale(k: number): ZoomTransform;
    translate(x: number, y: number): ZoomTransform;
    toString(): string;
  }

  export interface ZoomBehavior<ZoomRefElement, Datum> {
    (selection: Selection<ZoomRefElement, Datum, unknown, unknown>): void;
    on(typenames: string, listener: (event: ZoomEvent<ZoomRefElement, Datum>) => void): this;
    scaleExtent(extent: [number, number]): this;
    translateExtent(extent: [[number, number], [number, number]]): this;
    transform(
      selection: Selection<ZoomRefElement, Datum, unknown, unknown>,
      transform: ZoomTransform
    ): void;
  }

  export interface ZoomEvent<ZoomRefElement, Datum> {
    type: string;
    transform: ZoomTransform;
    sourceEvent: unknown;
    target: ZoomBehavior<ZoomRefElement, Datum>;
  }

  export function zoom<ZoomRefElement extends Element, Datum = unknown>(): ZoomBehavior<
    ZoomRefElement,
    Datum
  >;
}
