import { xml2js } from 'xml-js';
import { z } from 'zod';

const DeclarationZod = z.object({
    type: z.undefined(),
    declaration: z.object({
        attributes: z.record(z.string(), z.string())
    }).optional(),
    elements: z.array(z.unknown()),
});

const CDataZod = z.object({
    type: z.literal('cdata'),
    cdata: z.string(),
    elements: z.undefined(),
});

const TextZod = z.object({
    type: z.literal('text'),
    text: z.string(),
    elements: z.undefined(),
});

const ElementZod = z.object({
    type: z.literal('element'),
    name: z.string(),
    attributes: z.record(z.string(), z.string()).optional(),
    elements: z.array(z.unknown()).optional(),
});

const InstructionZod = z.object({
    type: z.literal('instruction'),
});

const CommentZod = z.object({
    type: z.literal('comment'),
});

export type DeclarationType = {
    type: undefined,
    declaration?: {
        attributes: Record<string, string>,
    },
    elements: Array<XmlNode>,
};

export class XmlElement {
    protected 'nominal' = 'nominal';
    public readonly type: 'element' = 'element';
    
    public constructor(
        public readonly name: string,
        public readonly attributes: Record<string, string>,
        public readonly elements: Array<XmlNode>,
    ) {}

    findXpath = (path: Array<string>): Array<XmlElement> => {
        const [first, ...restPath] = path;

        if (first === undefined) {
            return [this];
        }

        const result: Array<XmlElement> = [];

        for (const child of this.elements) {
            if (child.type === 'element' && child.name === first) {
                result.push(...child.findXpath(restPath));
            }
        }

        return result;
    }

    
}

export class XmlCData {
    protected nominal: 'nominal' = 'nominal';
    public readonly type: 'cdata' = 'cdata';
    public constructor(
        public readonly cdata: string,
    ) {}
}

export class XmlText {
    protected 'nominal' = 'nominal';
    public readonly type: 'text' = 'text';
    public constructor(
        public readonly text: string,
    ) {}
}

export type XmlNode = XmlCData | XmlText | XmlElement;

/*
{
    "declaration": {
        "attributes": {
            "version": "1.0",
            "encoding": "UTF-8"
        }
    },
    "elements": [

        {
            "type": "cdata",
            "cdata": "Oddział dla Dzieci"
        }

        {
            "type": "text",
            "text": "https://www.mbp.chrzanow.pl/?p=76101"
        }

            "type": "element",
            "name": "rss",
            "attributes": {
                "version": "2.0",
                "xmlns:content": "http://purl.org/rss/1.0/modules/content/",
                "xmlns:wfw": "http://wellformedweb.org/CommentAPI/",
                "xmlns:dc": "http://purl.org/dc/elements/1.1/",
                "xmlns:atom": "http://www.w3.org/2005/Atom",
                "xmlns:sy": "http://purl.org/rss/1.0/modules/syndication/",
                "xmlns:slash": "http://purl.org/rss/1.0/modules/slash/"
            },
            "elements": [
*/

/*
const parseElement = (data: unknown): ElementType => {
    const cdata = CDataZOD.safeParse(data);
    if (cdata.success) {
        return cdata.data;
    }

    const text = TextZOD.safeParse(data);
    if (text.success) {
        return text.data;
    }

    const element = ElementZOD.safeParse(data);
    if (element.success) {
        const elements = (element.data.elements ?? []).map(parseElement);

        return {
            type: 'element',
            name: element.data.name,
            attributes: element.data.attributes,
            elements,
        };
    }

    console.info('data', JSON.stringify(data, null, 4));
    throw Error('Not matched');
};
*/

const parseElementArray = (list: Array<unknown>): Array<XmlNode> => {
    const result: Array<XmlNode> = [];

    for (const item of list) {
        const cdata = CDataZod.safeParse(item);
        if (cdata.success) {
            result.push(new XmlCData(cdata.data.cdata));
            continue;
        }
    
        const text = TextZod.safeParse(item);
        if (text.success) {
            result.push(new XmlText(text.data.text));
            continue;
        }
    
        const element = ElementZod.safeParse(item);
        if (element.success) {
            const elements = parseElementArray(element.data.elements ?? []);
    
            result.push(new XmlElement(element.data.name, element.data.attributes ?? {}, elements));
            continue;
        }

        const instruction = InstructionZod.safeParse(item);
        if (instruction.success) {
            //ignore
            continue;
        }

        const comment = CommentZod.safeParse(item);
        if (comment.success) {
            //ignore
            continue;
        }
    
        console.info('data', JSON.stringify(item, null, 4));
        throw Error('Not matched');
    }

    return result;
};

export const parseXml = (data: string): DeclarationType => {
    const root = xml2js(data);

    const rootSafe = DeclarationZod.safeParse(root);

    if (rootSafe.success) {
        return {
            type: undefined,
            declaration: rootSafe.data.declaration,
            elements: parseElementArray(rootSafe.data.elements),
        };
    }

    console.info('all xml', JSON.stringify(root, null, 4));
    throw Error('parseXml - unknown data');
};



export class XmlElementOnly {
    constructor(
        public readonly node: XmlElement,
        public readonly child: Array<XmlElementOnly>
    ) {
    }

    private static convertXmlElement = (main: XmlNode): XmlElementOnly => {
        const child = [];
    
        if (main.type !== 'element') {
            throw Error('Element powinien być typu Node');
        }
    
        for (const node of main.elements) {
            child.push(XmlElementOnly.convertXmlElement(node));
        }
    
        return new XmlElementOnly(
            main,
            child
        );
    };
    
    public static parse = (data: string): XmlElementOnly => {
        const xml = parseXml(data);
    
        const [main, ...restElements] = xml.elements;
    
        if (main === undefined || restElements.length > 0) {
            throw Error('Spodziewano się dokładnie jednego elementu');
        }
    
        return XmlElementOnly.convertXmlElement(main);
    };
}

