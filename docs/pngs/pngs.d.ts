/* tslint:disable */
/* eslint-disable */
/**
* @param {Uint8Array} image
* @param {number} width
* @param {number} height
* @param {Uint8Array | undefined} palette
* @param {Uint8Array | undefined} trns
* @param {number | undefined} color
* @param {number | undefined} depth
* @param {number | undefined} compression
* @param {number | undefined} filter
* @returns {Uint8Array}
*/
export function encode(image: Uint8Array, width: number, height: number, palette?: Uint8Array, trns?: Uint8Array, color?: number, depth?: number, compression?: number, filter?: number): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly encode: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number) => void;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
        