const cheerio = require('cheerio');

// --- Helper Functions ---

/**
 * Generic function to process child nodes of an element using the main Cheerio instance.
 * @param {cheerio.CheerioAPI} $ - The main Cheerio instance.
 * @param {cheerio.Element|cheerio.Node} parentNode - The parent Cheerio element or node.
 * @returns {string} Concatenated Markdown of child elements/nodes.
 */
function processChildren($, parentNode) {
    if (!parentNode) return '';

    let content = '';
    // Use the passed $ instance with the parentNode context
    $(parentNode).contents().each((_, node) => {
        // Pass $ down to convertNode
        content += convertNode($, node);
    });
    // Remove trim() as it might interfere with intended newlines
    return content;
}

/**
 * Maps a Cheerio node to its corresponding converter function.
 * Handles different node types (elements, text).
 * @param {cheerio.CheerioAPI} $ - The main Cheerio instance.
 * @param {cheerio.Node} node - The Cheerio node.
 * @returns {string} Markdown representation.
 */
function convertNode($, node) {
    if (!node) return ''; // Handle null/undefined nodes

    if (node.type === 'text') {
        // Preserve newlines, collapse other whitespace to single spaces
        return $(node).text()
            .replace(/[ \t\r\f\v]+/g, ' ') // Collapse horizontal whitespace to single space
            .replace(/ +\n/g, '\n') // Remove spaces before newlines
            .replace(/\n +/g, '\n'); // Remove spaces after newlines
    }

    if (node.type === 'tag') {
        const element = node; // For clarity, node is an element here
        const tagName = (element.tagName || '').toLowerCase();
        switch (tagName) {
            // Pass $ to all converter functions
            case 'h1': return convertH1($, element);
            case 'h2': return convertH2($, element);
            case 'h3': return convertH3($, element);
            case 'p': return convertP($, element);
            case 'a': return convertA($, element);
            case 'code': return convertCode($, element);
            case 'u': return convertU($, element);
            case 'strong':
            case 'b': return convertStrong($, element);
            case 'em':
            case 'i': return convertEm($, element);
            case 'ul': return convertUl($, element);
            case 'ol': return convertOl($, element);
            case 'li': return convertLi($, element); // Basic handling if encountered outside ul/ol
            case 'br': return '  \n';
            case 'hr': return '--- \n\n';
            case 'blockquote': return `> ${processChildren($, element).replace(/\n/g, '\n> ')}\n\n`;
            case 'ac:structured-macro': return convertAcMacro($, element);
            case 'ac:link': return convertAcLink($, element);
            case 'ac:inline-comment-marker': return convertAcInlineCommentMarker($, element);
            case 'ac:parameter':
            case 'ac:plain-text-body':
            case 'ac:rich-text-body':
            case 'ac:link-body':
            case 'ri:page':
            case 'ri:attachment':
                 return processChildren($, element);
            case 'table': return convertTable($, element);
            case 'tr':
            case 'th':
            case 'td':
            case 'thead':
            case 'tbody':
            case 'tfoot':
                return processChildren($, element);
            case 'div':
            case 'span':
                return processChildren($, element);
            case 'img':
                 const altAttr = $(element).attr('alt') || '';
                 const srcAttr = $(element).attr('src') || '';
                 // Confluence specific attribute for filename
                 const confluenceFilename = $(element).attr('data-linked-resource-default-alias') || '';

                 // Try to extract filename from src if confluence attribute is missing
                 let filenameFromSrc = '';
                 try {
                     const urlParts = srcAttr.split('/');
                     filenameFromSrc = urlParts[urlParts.length - 1].split('?')[0]; // Get last part, remove query params
                     // Decode URI component if needed
                     filenameFromSrc = decodeURIComponent(filenameFromSrc);
                 } catch (e) { /* ignore errors parsing src */ }

                 // Determine the best alt text: use alt > confluence filename > filename from src > empty
                 const altText = altAttr || confluenceFilename || filenameFromSrc;

                 // TODO: Resolve relative URLs or download images if necessary.
                 // For now, use the src directly.
                 return `![${altText}](${srcAttr})`;
            case 'ac:adf-extension':
                // Check for specific ADF structures like decision lists
                // Use double backslash escape for colons in tag names within JS strings
                const decisionListNode = $(element).find('> ac\\:adf-node[type="decision-list"]');
                if (decisionListNode.length > 0) {
                    const decisionItemNode = decisionListNode.find('> ac\\:adf-node[type="decision-item"]');
                    if (decisionItemNode.length > 0) {
                        const decisionContent = decisionItemNode.find('> ac\\:adf-content').text().trim();
                        return `**Decision:** ${decisionContent}\n\n`;
                    }
                }
                // Fallback for other adf-extensions: try processing children or fallback content
                const fallbackContent = $(element).find('> ac\\:adf-fallback');
                if (fallbackContent.length > 0) {
                    return processChildren($, fallbackContent.get(0));
                }
                return processChildren($, element); // General fallback
            default:
                return processChildren($, element);
        }
    }
    return '';
}

// --- Element Conversion Functions (now accept $ as first arg) ---

function convertH1($, element) {
    return `# ${processChildren($, element).trim()}\n\n`;
}

function convertH2($, element) {
    return `## ${processChildren($, element).trim()}\n\n`;
}

function convertH3($, element) {
    return `### ${processChildren($, element).trim()}\n\n`;
}

function convertP($, element) {
    const content = processChildren($, element).trim();
    return content ? `${content}\n\n` : '';
}

function convertA($, element) {
    const href = $(element).attr('href') || '';
    const text = processChildren($, element).trim();
    const linkText = text || href;
    return `[${linkText}](${href})`;
}

function convertCode($, element) {
    return `\`${$(element).text()}\``;
}

function convertU($, element) {
    return processChildren($, element);
}

function convertStrong($, element) {
    return `**${processChildren($, element)}**`;
}

function convertEm($, element) {
    return `*${processChildren($, element)}*`;
}

function convertLi($, element, marker = '*') {
    return `${marker} ${processChildren($, element).trim()}\n`;
}

function convertUl($, element) {
    let listContent = '';
    // Use the passed $ instance to find children
    $(element).children('li').each((_, li) => {
        listContent += convertLi($, li, '*');
    });
    return listContent + '\n';
}

function convertOl($, element) {
    let listContent = '';
    let counter = 1;
    $(element).children('li').each((_, li) => {
        listContent += convertLi($, li, `${counter}.`);
        counter++;
    });
    return listContent + '\n';
}

function convertAcMacro($, element) {
    const macroName = $(element).attr('ac:name');
    switch (macroName) {
        case 'toc':
            return '';
        case 'code':
            return convertCodeBlock($, element);
        case 'info':
        case 'note':
        case 'tip':
        case 'warning':
            // Treat these like blockquotes or just extract content with emphasis
            return `> **${macroName.toUpperCase()}:** ${processChildren($, element).trim()}\n\n`;
        case 'panel':
            // Similar to blockquote, maybe with a separator
            return `> ${processChildren($, element).trim()}\n\n`;
        case 'expand':
            const title = $(element).find('ac\\:parameter[ac\\:name="title"]').text() || 'Details';
            // Use HTML <details> and <summary> for expand functionality
            return `<details>\n<summary>${title}</summary>\n\n${processChildren($, element).trim()}\n\n</details>\n\n`;
        case 'children': // Handle the children macro
            // Often used for page trees, might not translate well directly.
            // Could be replaced with a placeholder or ignored.
            return '<!-- Children Macro Placeholder -->\n\n';
        case 'details': // Handle the details macro (used in Australia Post example)
             // Similar to expand, let's use HTML <details>
             return `<details>\n<summary>Details</summary>\n\n${processChildren($, element).trim()}\n\n</details>\n\n`;
        default:
            // console.warn(`Unsupported macro encountered: ${macroName}. Processing children.`);
            // Return the inner content for unknown macros, followed by a line break
            const content = processChildren($, element).trim();
            return content ? `${content}\n\n` : ''; // Add line break only if there is content
    }
}

function convertCodeBlock($, element) {
    const languageParam = $(element).find('ac\\:parameter[ac\\:name="language"]');
    const language = languageParam.length ? languageParam.text() : '';
    // Find the body using the passed $ instance
    const codeContent = $(element).find('ac\\:plain-text-body').text();
    const trimmedContent = codeContent.replace(/^\s*\n|\n\s*$/g, '');
    return `\`\`\`${language}\n${trimmedContent}\n\`\`\`\n\n`;
}

function convertAcLink($, element) {
    const linkBody = $(element).find('ac\\:link-body');
    if (linkBody.length > 0) {
        // Pass $ to processChildren
        return processChildren($, linkBody.get(0));
    }
    // Pass $ to processChildren
    return processChildren($, element);
}

function convertAcInlineCommentMarker($, element) {
    // Pass $ to processChildren
    return processChildren($, element);
}

// --- Table Conversion Functions (now accept $) ---

function convertTableCell($, element) {
    // Pass $ to processChildren
    const content = processChildren($, element)
        .trim()
        // Replace pipes first to avoid issues with escaped pipes in the next step
        .replace(/\|/g, '\\|')
        // Replace newlines with <br> tags to handle multi-line content within cells
        .replace(/\n/g, '<br>');
    return content;
}

function convertTr($, element) {
    let cells = [];
    let isHeader = false;
    // Use passed $ to find children
    $(element).children('th, td').each((_, cellNode) => {
        // Pass $ to convertTableCell
        const cellContent = convertTableCell($, cellNode);
        cells.push(cellContent);
        if (cellNode.tagName.toLowerCase() === 'th') {
            isHeader = true;
        }
    });
    return { cells, isHeader };
}

function convertTable($, element) {
    let markdownRows = [];
    let headerDetected = false;
    let columnCount = 0;

    // Use passed $ to find rows
    const headRows = $(element).find('> thead > tr');
    const bodyRows = $(element).find('> tbody > tr, > tr');

    headRows.each((_, rowElement) => {
        // Pass $ to convertTr
        const { cells } = convertTr($, rowElement);
        if (cells.length === 0) return;
        markdownRows.push(`| ${cells.join(' | ')} |`);
        headerDetected = true;
        columnCount = Math.max(columnCount, cells.length);
    });

    if (headerDetected) {
        const separator = `| ${Array(columnCount).fill('---').join(' | ')} |`;
        markdownRows.splice(1, 0, separator);
    }

    bodyRows.each((index, rowElement) => {
        // Pass $ to convertTr
        const { cells, isHeader } = convertTr($, rowElement);
        if (cells.length === 0) return;

        if (!headerDetected && index === 0) {
            markdownRows.push(`| ${cells.join(' | ')} |`);
            columnCount = Math.max(columnCount, cells.length);
            const separator = `| ${Array(columnCount).fill('---').join(' | ')} |`;
            markdownRows.push(separator);
        } else {
            markdownRows.push(`| ${cells.join(' | ')} |`);
        }
    });

    return markdownRows.join('\n') + '\n\n';
}

// --- End Table Conversion ---


module.exports = {
    convertNode, // Keep exporting convertNode
    // processChildren is internal, no need to export unless used elsewhere
};
