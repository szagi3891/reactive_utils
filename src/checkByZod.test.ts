import { z } from 'zod';
import { expect } from "jsr:@std/expect";
import { CheckByZod } from "./checkByZod.ts";

Deno.test('basic', () => {
        
    const messageCheck = new CheckByZod('basic MessageZod', z.object({
        name: z.string(),
        age: z.number(),
        sub: z.discriminatedUnion('type', [        
            z.object({
                type: z.literal('one'),
                name: z.string(),
                year: z.number(),
                show: z.boolean(),
            }),
            z.object({
                type: z.literal('second'),
                name: z.string(),
                age: z.number(),
                sub2: z.discriminatedUnion('type', [
                    z.object({
                        type: z.literal('ver1'),
                        name: z.string(),
                    }),
                    z.object({
                        type: z.literal('ver2'),
                        age: z.number(),
                    }),
                    z.object({
                        type: z.literal('ver3'),
                        show: z.boolean(),
                    }),
                ])
            }),
        ]),
    }))

    expect(messageCheck.check({
        name: 'dd',
        age: 444,
        sub: {
            type: 'one',
            name: 'dddd',
            show: false,
        }
    })).toEqual({
        "type": "error",
        "error": {
            "description": 'basic MessageZod',
            "errors": [
                {
                    "field": "sub.year",
                    "message": "Required"
                }
            ],
            "data": {
                "name": "dd",
                "age": 444,
                "sub": {
                    "type": "one",
                    "name": "dddd",
                    "show": false
                }
            }
        }
    });

    expect(messageCheck.check({
        name: 'dd',
        age: 444,
        sub: {
            type: 'second',
            name: 'dddd',
            show: false,
        }
    })).toEqual({
        "type": "error",
        "error": {
            "description": 'basic MessageZod',
            "errors": [
                {
                    "field": "sub.age",
                    "message": "Required"
                },
                {
                    field: "sub.sub2",
                    message: "Required",
                },
            ],
            "data": {
                "name": "dd",
                "age": 444,
                "sub": {
                    "type": "second",
                    "name": "dddd",
                    "show": false
                }
            }
        }
    });

    expect(messageCheck.check({
        name: 'dd',
        age: 444,
        sub: {
            type: 'second',
            name: 'dddd',
            show: false,
            sub2: {},
        }
    })).toEqual({
        "type": "error",
        "error": {
            "description": 'basic MessageZod',
            "errors": [
                {
                    "field": "sub.age",
                    "message": "Required"
                },
                {
                    field: "sub.sub2.type",
                    message: "Invalid discriminator value. Expected 'ver1' | 'ver2' | 'ver3'",
                },
            ],
            "data": {
                "name": "dd",
                "age": 444,
                "sub": {
                    "type": "second",
                    "name": "dddd",
                    "show": false,
                    sub2: {}
                }
            }
        }
    });


    expect(messageCheck.check({
        name: 'dd',
        age: 444,
        sub: {
            type: 'second',
            name: 'dddd',
            show: false,
            age: 444,
            sub2: {},
        }
    })).toEqual({
        "type": "error",
        "error": {
            "description": 'basic MessageZod',
            "errors": [
                {
                    field: "sub.sub2.type",
                    message: "Invalid discriminator value. Expected 'ver1' | 'ver2' | 'ver3'",
                },
            ],
            "data": {
                "name": "dd",
                "age": 444,
                "sub": {
                    "type": "second",
                    "name": "dddd",
                    "show": false,
                    age: 444,
                    sub2: {}
                }
            }
        }
    });


    expect(messageCheck.check({
        name: 'dd',
        age: 444,
        sub: {
            type: 'second',
            name: 'dddd',
            show: false,
            age: 444,
            sub2: {
                type: 'ver2',
            },
        }
    })).toEqual({
        "type": "error",
        "error": {
            "description": 'basic MessageZod',
            "errors": [
                {
                    field: "sub.sub2.age",
                    message: "Required",                    
                },
            ],
            "data": {
                "name": "dd",
                "age": 444,
                "sub": {
                    "type": "second",
                    "name": "dddd",
                    "show": false,
                    age: 444,
                    sub2: {
                        type: 'ver2',
                    }
                }
            }
        }
    });


    expect(messageCheck.check({
        name: 'dd',
        age: 444,
        sub: {
            type: 'second',
            name: 'dddd',
            show: false,
            age: 444,
            sub2: {
                type: 'ver2',
                age: null,
            },
        }
    })).toEqual({
        "type": "error",
        "error": {
            "description": 'basic MessageZod',
            "errors": [
                {
                    field: "sub.sub2.age",
                    message: "Expected number, received null",
                },
            ],
            "data": {
                "name": "dd",
                "age": 444,
                "sub": {
                    "type": "second",
                    "name": "dddd",
                    "show": false,
                    age: 444,
                    sub2: {
                        type: 'ver2',
                        age: null,
                    }
                }
            }
        }
    });


    expect(messageCheck.check({
        name: 'dd',
        age: 444,
        sub: {
            type: 'second',
            name: 'dddd',
            show: false,
            age: 444,
            sub2: {
                type: 'ver2',
                age: 4543,
            },
        }
    })).toEqual({
        "type": "ok",
        "value": {
            "name": "dd",
            "age": 444,
            "sub": {
                "type": "second",
                "name": "dddd",
                age: 444,
                sub2: {
                    type: 'ver2',
                    age: 4543,
                }
            }
        }
    });
});

