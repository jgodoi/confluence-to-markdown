# Confluence to Markdown Converter (conf2md)

A Node.js script to fetch pages from Confluence using its REST API and convert their content from Confluence Storage Format (XHTML) to Markdown.

## Prerequisites

*   [Node.js](https://nodejs.org/) (which includes npm)

## Installation

1.  **Clone the repository (or download the files):**
    ```bash
    git clone https://github.com/jgodoi/confluence-to-markdown.git
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Configuration

1.  **Create a `.env` file** in the root directory of the project.
2.  **Add your Confluence details** to the `.env` file:
    ```dotenv
    # .env file
    CONFLUENCE_BASE_URL="your_domain.atlassian.net" # Your Confluence domain (e.g., mycompany.atlassian.net)
    CONFLUENCE_EMAIL="your_email@example.com"     # Your Confluence login email
    CONFLUENCE_API_TOKEN="your_api_token"         # Your Confluence API Token (generate one in your Atlassian account settings)
    ```
    *   **Important:** Make sure the `.env` file is added to your `.gitignore` file to avoid committing sensitive credentials.

## Usage

1.  **Modify the Query (Optional):** Currently, the script fetches pages modified since a specific date. You can adjust the `cql` variable in `index.js` to change the query criteria or the `limit` in the `apiUrl`.
    ```javascript
    // filepath: index.js
    // ...
    // Construct the CQL query (URL encoded)
    const cql = encodeURIComponent('lastmodified >= "2025-04-17" AND type=page'); // <-- Modify date or query here
    // Add space to the expand parameter to get space information
    const apiUrl = `https://${confluenceBaseUrl}/wiki/rest/api/content/search?cql=${cql}&limit=10&expand=body.storage,space`; // <-- Modify limit here
    // ...
    ```
2.  **Run the script:**
    ```bash
    node index.js
    ```
3.  **Output:** The script will:
    *   Create an `output` directory if it doesn't exist.
    *   Fetch the specified Confluence pages.
    *   Convert each page to Markdown.
    *   Save each converted page as a `.md` file inside the `output` directory. Filenames will be in the format `spacekey_pagetitle.md`.

## Running Tests

To run the included unit tests for the parser:

```bash
npm test
```
