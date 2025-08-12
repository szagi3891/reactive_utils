import { expect } from "jsr:@std/expect";
import { stringifySort } from "./Json.ts";

Deno.test('basic', () => {

    expect(stringifySort({
        'a': 'a',
        'c': 'c',
        'b': 'b'
    })).toBe('{"a":"a","b":"b","c":"c"}');

    expect(stringifySort({
        'a': 'a',
        'c': 'c',
        'b': [
            {
                'z': 'z',
                'a': 'a'
            },
            {
                'k': 'k',
                'r': 'r',
                'a': 'a'
            }
        ]
    })).toBe('{"a":"a","b":[{"a":"a","z":"z"},{"a":"a","k":"k","r":"r"}],"c":"c"}');


    expect(stringifySort({
        'a': 'a',
        'c': 'c',
        'b': [
            {
                'z': 'z',
                'a': 'a',
                'b': {
                    'z':'z',
                    'a':'a'
                }
            },
            {
                'k': 'k',
                'r': 'r',
                'a': 'a'
            }
        ]
    })).toBe('{"a":"a","b":[{"a":"a","b":{"a":"a","z":"z"},"z":"z"},{"a":"a","k":"k","r":"r"}],"c":"c"}');
});
