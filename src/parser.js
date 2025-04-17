const cheerio = require('cheerio');
const { convertNode } = require('./converters');

/**
 * Parses Confluence Storage Format (XHTML) into Markdown.
 * @param {string} confluenceContent - The Confluence XHTML content.
 * @returns {string} The converted Markdown content.
 */
function parseConfluence(confluenceContent) {
    // Load the Confluence content into cheerio
    // Use xmlMode to handle self-closing tags and namespaces correctly
    const $ = cheerio.load(confluenceContent, { xmlMode: true });

    let markdownOutput = '';

    // Process top-level elements in the body
    // Confluence content is often wrapped, find the main content area if necessary
    // For now, let's assume the direct children of the root are the content
    $.root().children().each((index, element) => {
        // Pass the main $ instance to convertNode
        markdownOutput += convertNode($, element);
    });

    // Basic cleanup (can be expanded)
    // - Remove excessive blank lines
    markdownOutput = markdownOutput.replace(/\n{3,}/g, '\n\n');

    return markdownOutput;
}

module.exports = { parseConfluence };