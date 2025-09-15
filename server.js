const fastify = require('fastify')({ logger: true });
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

// Serve the frontend files
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, ''),
});

// Clistream backend logic
const BASE_URL = 'https://himovies.to';

async function searchContent(query) {
  try {
    const searchUrl = `${BASE_URL}/search/${query.replace(/\s/g, '-')}`;
    const response = await axios.get(searchUrl);
    const $ = cheerio.load(response.data);
    const searchResults = [];

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
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const serverId = $('.server-item').first().attr('data-id');

    const ajaxResponse = await axios.get(`${BASE_URL}/ajax/episode/sources/${serverId}`);
    const streamUrl = ajaxResponse.data.link;
    
    return streamUrl;

  } catch (error) {
    console.error('Error getting stream URL:', error);
    return null;
  }
}

// API Routes
fastify.get('/search', async (request, reply) => {
  const query = request.query.q;
  const results = await searchContent(query);
  reply.send(results);
});

fastify.get('/stream', async (request, reply) => {
    const url = request.query.url;
    const streamUrl = await getStreamUrl(url);
    if (streamUrl) {
      reply.send({ streamUrl });
    } else {
      reply.status(500).send({ error: 'Could not retrieve stream URL' });
    }
  });
  

// Run the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
