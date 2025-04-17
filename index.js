require('dotenv').config(); // Load environment variables from .env file

const fs = require('fs');
const axios = require('axios');
const path = require('path');
const { parseConfluence } = require('./src/parser');

// --- Configuration ---
const confluenceBaseUrl = process.env.CONFLUENCE_BASE_URL; // Read from .env
const email = process.env.CONFLUENCE_EMAIL;
const apiToken = process.env.CONFLUENCE_API_TOKEN;

// Construct the CQL query (URL encoded)
const cql = encodeURIComponent('lastmodified >= "2025-04-17" AND type=page');
// Add space to the expand parameter to get space information
const apiUrl = `https://${confluenceBaseUrl}/wiki/rest/api/content/search?cql=${cql}&limit=10&expand=body.storage,space`; // Full URL for axios

const outputFile = process.argv[2] || 'output.md'; // Output file can still be specified
const outputDir = 'output'; // Define the output directory name

// --- Input Validation ---
if (!email || !apiToken || !confluenceBaseUrl) {
    console.error('Error: CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN, and CONFLUENCE_BASE_URL environment variables must be set.');
    console.error('Please set them in your .env file before running the script.');
    process.exit(1);
}

// --- Main Function (using axios) ---
async function fetchAndParseConfluence() {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)){
        console.log(`Creating output directory: ${outputDir}`);
        fs.mkdirSync(outputDir);
    }

    console.log(`Fetching content from: ${apiUrl}`); // Log the exact URL being used

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
                'Accept': 'application/json'
            }
        });

        console.log(`Status Code: ${response.status}`);

        const jsonData = response.data;

        // Log the raw results count and potentially the first result for inspection
        console.log(`API returned ${jsonData.results ? jsonData.results.length : 'undefined'} results.`);
        if (jsonData.results && jsonData.results.length > 0) {
            console.log('First result sample:', JSON.stringify(jsonData.results[0], null, 2)); // Log first result prettified
        }

        if (!jsonData.results || jsonData.results.length === 0) {
            console.log('No pages found matching the criteria.');
            // Add more details about the query used
            console.log(`Query used: ${cql}`);
            console.log(`Full API URL: ${apiUrl}`);
            return;
        }

        console.log(`Found ${jsonData.results.length} pages to process.`);

        // Process all results
        for (const page of jsonData.results) {
            const confluenceContent = page.body.storage.value;
            const pageTitle = page.title;
            const pageId = page.id;
            // Extract space key, provide a default if not found
            const spaceKey = page.space && page.space.key ? page.space.key : 'UNKNOWN_SPACE';

            console.log(`Processing page: "${pageTitle}" (ID: ${pageId}, Space: ${spaceKey})`);

            try {
                const markdownContent = parseConfluence(confluenceContent);

                // Sanitize title and space key for filename
                const sanitizedTitle = pageTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const sanitizedSpaceKey = spaceKey.replace(/[^a-z0-9]/gi, '_').toLowerCase();

                // Prepend sanitized space key to the filename
                const baseFilename = `${sanitizedSpaceKey}_${sanitizedTitle}.md`;
                const finalOutputFile = path.join(outputDir, baseFilename);

                fs.writeFileSync(finalOutputFile, markdownContent, 'utf8');
                console.log(`  Successfully converted page "${pageTitle}" to "${finalOutputFile}"`);
            } catch (parseError) {
                console.error(`  Error processing page "${pageTitle}" (ID: ${pageId}, Space: ${spaceKey}):`, parseError.message);
                // Continue to the next page even if one fails
            }
        }

        console.log('Finished processing all pages.');

    } catch (error) {
        console.error('Error fetching or processing Confluence data:');
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error(`  Status: ${error.response.status} (${error.response.statusText})`); // Add statusText
            console.error('  Headers:', JSON.stringify(error.response.headers, null, 2)); // Prettify headers
            console.error('  Data:', JSON.stringify(error.response.data, null, 2)); // Prettify data
        } else if (error.request) {
            // The request was made but no response was received
            console.error('  Error: No response received from server.');
            console.error('  Request details:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('  Error setting up request:', error.message);
        }
        // Log the full error object for more context if needed
        console.error('  Full Error Object:', error);
        process.exit(1);
    }
}

// --- Execute ---
fetchAndParseConfluence();
