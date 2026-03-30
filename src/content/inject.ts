(function() {
  const { fetch: originalFetch } = window;

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;

    if (url.includes('/api/v1/') && (url.includes('/profile') || url.includes('/post/'))) {
      const clone = response.clone();
      clone.json().then(data => {
        window.postMessage({
          type: 'BETTER_SU_API_RESPONSE',
          url: url,
          payload: data
        }, '*');
      }).catch(() => {});
    }

    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL) {
    this.addEventListener('load', function() {
      const urlStr = url.toString();
      if (urlStr.includes('/api/v1/') && (urlStr.includes('/profile') || urlStr.includes('/post/'))) {
        try {
          const data = JSON.parse(this.responseText);
          window.postMessage({
            type: 'BETTER_SU_API_RESPONSE',
            url: urlStr,
            payload: data
          }, '*');
        } catch (e) {}
      }
    });
    // @ts-ignore
    return originalOpen.apply(this, arguments);
  };
})();
