document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('results');
    const videoPlayer = document.getElementById('videoPlayer');
  
    searchButton.addEventListener('click', async () => {
      const query = searchInput.value;
      const response = await fetch(`/search?q=${query}`);
      const results = await response.json();
      
      resultsDiv.innerHTML = '';
      results.forEach(result => {
        const p = document.createElement('p');
        p.textContent = result.title;
        p.style.cursor = 'pointer';
        p.addEventListener('click', () => getStream(result.url));
        resultsDiv.appendChild(p);
      });
    });
  
    async function getStream(url) {
      const response = await fetch(`/stream?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      playStream(data.streamUrl);
    }
  
    function playStream(streamUrl) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(videoPlayer);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoPlayer.play();
        });
      } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        videoPlayer.src = streamUrl;
        videoPlayer.addEventListener('loadedmetadata', () => {
          videoPlayer.play();
        });
      }
    }
  });
