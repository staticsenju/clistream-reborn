const fastify = require('fastify')({ logger: true });
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { hostname } = require("os");

// Serve the frontend files (e.g., index.html, client.js)
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, ''),
});

// --- Backend Logic from clistream ---

const BASE_URL = 'https://himovies.to';

async function searchContent(query) {
  try {
    // Construct the search URL, replacing spaces with hyphens
    const searchUrl = `${BASE_URL}/search/${query.replace(/\s/g, '-')}`;
    const response = await axios.get(searchUrl);
    const $ = cheerio.load(response.data);
    const searchResults = [];

    // Scrape the search results page
    $('.flw-item').each((i, el) => {
      const title = $(el).find('.film-name a').text();
      const url = $(el).find('.film-name a').attr('href');
      if(url){
        searchResults.push({ title, url: `${BASE_URL}${url}` });
      }
    });

    return searchResults;
  } catch (error) {
    console.error('Error during search:', error);
    return [];
  }
}

async function getStreamUrl(url) {
  try {
    // Get the page for the selected movie/show
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Find the data-id for the first available server
    const serverId = $('.server-item').first().attr('data-id');

    // Make an AJAX request to get the stream sources
    const ajaxResponse = await axios.get(`${BASE_URL}/ajax/episode/sources/${serverId}`);
    const streamUrl = ajaxResponse.data.link;
    
    return streamUrl;

  } catch (error) {
    console.error('Error getting stream URL:', error);
    return null;
  }
}

// --- API Routes ---

// Endpoint to handle search requests from the frontend
fastify.get('/search', async (request, reply) => {
  const query = request.query.q;
  const results = await searchContent(query);
  reply.send(results);
});

// Endpoint to get the actual m3u8 stream URL
fastify.get('/stream', async (request, reply) => {
    const url = request.query.url;
    const streamUrl = await getStreamUrl(url);
    if (streamUrl) {
      reply.send({ streamUrl });
    } else {
      reply.status(500).send({ error: 'Could not retrieve stream URL' });
    }
  });
  
// --- Robust Server Start and Shutdown Logic ---

// Log helpful URLs once the server is listening
fastify.server.on("listening", () => {
	const address = fastify.server.address();
	console.log("Listening on:");
	console.log(`\thttp://localhost:${address.port}`);
	console.log(`\thttp://${hostname()}:${address.port}`);
});

// Graceful shutdown handler
function shutdown() {
	console.log("Signal received: closing HTTP server");
	fastify.close(() => {
        process.exit(0);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Configure the port from environment variables or default to 8080
let port = parseInt(process.env.PORT || "");
if (isNaN(port)) {
    port = 8080;
}

// Start the server, listening on all network interfaces
fastify.listen({
	port: port,
	host: "0.0.0.0",
});
