const { parseConfluence } = require('../src/parser');

describe('parseConfluence', () => {
    test('should convert basic paragraph', () => {
        const html = '<p>Hello world</p>';
        const expectedMarkdown = 'Hello world\n\n';
        expect(parseConfluence(html)).toBe(expectedMarkdown);
    });

    test('should convert heading level 1', () => {
        const html = '<h1>Title</h1>';
        const expectedMarkdown = '# Title\n\n';
        expect(parseConfluence(html)).toBe(expectedMarkdown);
    });

    test('should convert an unordered list', () => {
        const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
        // Note: The current implementation adds an extra newline after the list
        const expectedMarkdown = '* Item 1\n* Item 2\n\n';
        expect(parseConfluence(html)).toBe(expectedMarkdown);
    });

    test('should convert an ordered list', () => {
        const html = '<ol><li>First</li><li>Second</li></ol>';
        const expectedMarkdown = '1. First\n2. Second\n\n';
        expect(parseConfluence(html)).toBe(expectedMarkdown);
    });

    test('should convert a link', () => {
        const html = '<p>Visit <a href="https://example.com">Example</a></p>';
        const expectedMarkdown = 'Visit [Example](https://example.com)\n\n';
        expect(parseConfluence(html)).toBe(expectedMarkdown);
    });

    test('should convert bold text', () => {
        const html = '<p>Some <strong>bold</strong> text</p>';
        const expectedMarkdown = 'Some **bold** text\n\n';
        expect(parseConfluence(html)).toBe(expectedMarkdown);
    });

    test('should convert italic text', () => {
        const html = '<p>Some <em>italic</em> text</p>';
        const expectedMarkdown = 'Some *italic* text\n\n';
        expect(parseConfluence(html)).toBe(expectedMarkdown);
    });

    test('should convert inline code', () => {
        const html = '<p>Use the <code>parse()</code> function</p>';
        const expectedMarkdown = 'Use the `parse()` function\n\n';
        expect(parseConfluence(html)).toBe(expectedMarkdown);
    });

    test('should convert a simple table', () => {
        const html = '<table><tbody><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Row 1, Cell 1</td><td>Row 1, Cell 2</td></tr></tbody></table>';
        const expectedMarkdown = '| Header 1 | Header 2 |\n| --- | --- |\n| Row 1, Cell 1 | Row 1, Cell 2 |\n\n';
        expect(parseConfluence(html)).toBe(expectedMarkdown);
    });

    test('should handle table cell with line breaks', () => {
        const html = '<table><tbody><tr><td>Line 1\nLine 2</td></tr></tbody></table>';
        // Expecting <br> tags as per previous change
        const expectedMarkdown = '| Line 1<br>Line 2 |\n| --- |\n\n';
         expect(parseConfluence(html)).toBe(expectedMarkdown);
    });

    test('should convert a code block macro', () => {
        const html = '<ac:structured-macro ac:name="code" ac:schema-version="1"><ac:parameter ac:name="language">javascript</ac:parameter><ac:plain-text-body><![CDATA[console.log("Hello");]]></ac:plain-text-body></ac:structured-macro>';
        const expectedMarkdown = '```javascript\nconsole.log("Hello");\n```\n\n';
        expect(parseConfluence(html)).toBe(expectedMarkdown);
    });

     test('should convert an image with alt text', () => {
        const html = '<img src="/download/attachments/123/image.png" alt="My Image" />';
        const expectedMarkdown = '![My Image](/download/attachments/123/image.png)';
        expect(parseConfluence(html)).toBe(expectedMarkdown);
    });

    test('should convert an image using filename when alt is missing', () => {
        const html = '<img src="/download/attachments/123/another_image.jpg" data-linked-resource-default-alias="another_image.jpg" />';
        const expectedMarkdown = '![another_image.jpg](/download/attachments/123/another_image.jpg)';
        expect(parseConfluence(html)).toBe(expectedMarkdown);
    });

    test('should handle unknown macro by outputting content followed by newlines', () => {
        const html = '<ac:structured-macro ac:name="unknown"><ac:rich-text-body><p>Macro Content</p></ac:rich-text-body></ac:structured-macro>';
        const expectedMarkdown = 'Macro Content\n\n'; // Expect content + newlines
        expect(parseConfluence(html)).toBe(expectedMarkdown);
    });

    // Add more tests for edge cases, nested elements, other macros, etc.
});
