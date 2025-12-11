export default {
    async fetch(request, env) {
      const url = new URL(request.url);
  
      if (request.method === 'GET' && url.pathname === '/markers') {
        const { results } = await env.DB
          .prepare("SELECT * FROM markers")
          .all();
        return Response.json(results);
      }
  
      if (request.method === 'POST' && url.pathname === '/markers') {
        const { lat, lng } = await request.json();
        await env.DB
          .prepare("INSERT INTO markers (lat, lng) VALUES (?1, ?2)")
          .bind(lat, lng)
          .run();
        return new Response("OK");
      }
  
      return new Response("Not Found", { status: 404 });
    }
  };
  