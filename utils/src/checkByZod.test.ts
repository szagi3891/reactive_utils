import { z } from 'zod';
import { expect } from "jsr:@std/expect";
import { CheckByZod } from "./checkByZod.ts";

Deno.test('basic', () => {
        
    const messageCheck = CheckByZod.create('basic MessageZod', z.object({
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
            "description": 'CheckByZod: basic MessageZod',
            "errors": [
                {
                    "field": "sub.year",
                    "message": "Invalid input: expected number, received undefined"
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
            "description": 'CheckByZod: basic MessageZod',
            "errors": [
                {
                    "field": "sub.age",
                    "message": "Invalid input: expected number, received undefined"
                },
                {
                    field: "sub.sub2",
                    message: "Invalid input: expected object, received undefined",
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
            "description": 'CheckByZod: basic MessageZod',
            "errors": [
                {
                    "field": "sub.age",
                    "message": "Invalid input: expected number, received undefined"
                },
                {
                    field: "sub.sub2.type",
                    message: "Invalid input",
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
            "description": 'CheckByZod: basic MessageZod',
            "errors": [
                {
                    field: "sub.sub2.type",
                    message: "Invalid input",
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
            "description": 'CheckByZod: basic MessageZod',
            "errors": [
                {
                    field: "sub.sub2.age",
                    message: "Invalid input: expected number, received undefined",                    
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
            "description": 'CheckByZod: basic MessageZod',
            "errors": [
                {
                    field: "sub.sub2.age",
                    message: "Invalid input: expected number, received null",
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
        "data": {
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


Deno.test('jsonParse ok', () => {
    const data = '[{"type":"a","b":"b","c":44},{"type":"b","d":false}]';

    const validator = CheckByZod.create('test variant', z.array(z.discriminatedUnion('type', [
        z.object({
            type: z.literal('a'),
            b: z.string(),
            c: z.number(),
        }),
        z.object({
            type: z.literal('b'),
            d: z.boolean(),
        })
    ])));

    expect(validator.jsonParse(data)).toEqual({
        type: "ok",
        data: [{
            b: "b",
            c: 44,
            type: "a",
        }, {
            d: false,
            type: "b",
        }],
    });
});


Deno.test('jsonParse missing fields', () => {
    const data = '[{"type":"a","b":"b"},{"type":"b"}]';

    const validator = CheckByZod.create('test variant', z.array(z.discriminatedUnion('type', [
        z.object({
            type: z.literal('a'),
            b: z.string(),
            c: z.number(),
        }),
        z.object({
            type: z.literal('b'),
            d: z.boolean(),
        })
    ])));

    expect(validator.jsonParse(data)).toEqual({
        type: "error",
        error: {
            description: "CheckByZod: test variant",
            data: [{
                b: "b",
                type: "a",
            }, {
                type: "b",
            }],
            errors: [{
                field: "0.c",
                message: "Invalid input: expected number, received undefined",
            }, {
                field: "1.d",
                message: "Invalid input: expected boolean, received undefined",
            }],
        },
    });
});

Deno.test('jsonParse missing fields 2', () => {
    const data = '[{"type":"a","b":"b","c":false},{"type":"b","d":444}]';

    const validator = CheckByZod.create('test variant', z.array(z.discriminatedUnion('type', [
        z.object({
            type: z.literal('a'),
            b: z.string(),
            c: z.number(),
        }),
        z.object({
            type: z.literal('b'),
            d: z.boolean(),
        })
    ])));

    expect(validator.jsonParse(data)).toEqual({
        type: "error",
        error: {
            description: "CheckByZod: test variant",
            data: [{
                b: "b",
                type: "a",
                c: false,
            }, {
                type: "b",
                d: 444,
            }],
            errors: [{
                field: "0.c",
                message: "Invalid input: expected number, received boolean",
            }, {
                field: "1.d",
                message: "Invalid input: expected boolean, received number",
            }],
        },
    });
});

Deno.test('jsonParse missing fields 1', () => {
    const data = '[{"type":"a","b":"b","c":false},{"type":"b","d":true}]';

    const validator = CheckByZod.create('test variant', z.array(z.discriminatedUnion('type', [
        z.object({
            type: z.literal('a'),
            b: z.string(),
            c: z.number(),
        }),
        z.object({
            type: z.literal('b'),
            d: z.boolean(),
        })
    ])));

    expect(validator.jsonParse(data)).toEqual({
        type: "error",
        error: {
            description: "CheckByZod: test variant",
            data: [{
                b: "b",
                type: "a",
                c: false,
            }, {
                type: "b",
                d: true,
            }],
            errors: [{
                field: "0.c",
                message: "Invalid input: expected number, received boolean",
            }],
        },
    });
});


Deno.test('jsonParse missing fields 1', () => {
    const data = '[{"type":"a","b":"b","c":false},{"type":"b","d":t';

    const validator = CheckByZod.create('test variant', z.array(z.discriminatedUnion('type', [
        z.object({
            type: z.literal('a'),
            b: z.string(),
            c: z.number(),
        }),
        z.object({
            type: z.literal('b'),
            d: z.boolean(),
        })
    ])));

    expect(validator.jsonParse(data)).toEqual({
        type: "error",
        error: {
            data: '[{"type":"a","b":"b","c":false},{"type":"b","d":t',
            description: "CheckByZod: test variant",
            errors: [{
                field: "---",
                message: 'jsonParse: Parsing error',
            }]
        },
    });
});

Deno.test('jsonParseUnknown', () => {
    const fff = 444;

    const validator = CheckByZod.create('test variant', z.array(z.discriminatedUnion('type', [
        z.object({
            type: z.literal('a'),
            b: z.string(),
            c: z.number(),
        }),
        z.object({
            type: z.literal('b'),
            d: z.boolean(),
        })
    ])));

    expect(validator.jsonParseUnknown(fff)).toEqual({
        type: "error",
        error: {
            description: "CheckByZod: test variant",
            errors: [{
                field: "---",
                message: "jsonParseUnknown: expected string, received number",
            }],
            data: 444,
        },
    });
});

