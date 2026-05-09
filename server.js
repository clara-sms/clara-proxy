const http = require('http');
const https = require('https');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = "You are Clara, the AI assistant for Clara Clerk. You help small business owners manage their communications via SMS. Keep all responses under 160 characters. Be warm, direct and helpful. Clara Clerk plans: Light 19 pounds per month, Core 49, Pro 89, Elite 199. All include a 7 day free trial. Direct people to justtextclara.com to sign up.";

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/sms') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const message = data.message || '';
        
        const payload = JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 200,
          system: SYSTEM_PROMPT,
          messages: [{role: 'user', content: message}]
        });

        const options = {
          hostname: 'api.anthropic.com',
          path: '/v1/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Length': Buffer.byteLength(payload)
          }
        };

        const apiReq = https.request(options, (apiRes) => {
          let responseData = '';
          apiRes.on('data', chunk => { responseData += chunk; });
          apiRes.on('end', () => {
            try {
              const parsed = JSON.parse(responseData);
              const reply = parsed.content && parsed.content[0] 
                ? parsed.content[0].text 
                : 'Clara is unavailable right now.';
              res.writeHead(200, {'Content-Type': 'application/json'});
              res.end(JSON.stringify({reply: reply}));
            } catch(e) {
              res.writeHead(500);
              res.end(JSON.stringify({reply: 'Error processing response.'}));
            }
          });
        });

        apiReq.on('error', (e) => {
          res.writeHead(500);
          res.end(JSON.stringify({reply: 'Connection error.'}));
        });

        apiReq.write(payload);
        apiReq.end();

      } catch(e) {
        res.writeHead(400);
        res.end(JSON.stringify({reply: 'Bad request.'}));
      }
    });
  } else {
    res.writeHead(200);
    res.end('Clara SMS proxy running.');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Clara proxy running on port ' + PORT);
});
