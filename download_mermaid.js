const fs = require('fs');
const zlib = require('zlib');
const https = require('https');

const mermaidCode = `%%{init: {'theme':'dark'}}%%
flowchart TD
    A([1. Citizen spots issue]) --> B[2. Uploads Photo & Live Location]
    B --> C{3. AI Analyzes Image}
    C -->|Extracts Category, Severity & Drafts Complaint| D[4. Mapped Globally on CivicPulse]
    D --> E((5. Community Upvotes & Verifies))
    E --> F[/6. Automated Emails & Tweets sent to Govt/]
    F --> G[7. Govt Takes Action / Issue Resolved]
    G --> H([8. CivicPulse Timeline Updated with Proof])
    
    style A fill:#ff5a00,stroke:#333,stroke-width:2px,color:#fff
    style C fill:#0f172a,stroke:#3b82f6,stroke-width:3px,color:#fff
    style F fill:#3b82f6,stroke:#fff,stroke-width:2px,color:#fff
    style G fill:#22c55e,stroke:#fff,stroke-width:2px,color:#fff
    style H fill:#ff5a00,stroke:#333,stroke-width:2px,color:#fff
`;

const data = Buffer.from(mermaidCode, 'utf8');
const compressed = zlib.deflateSync(data);
const base64 = compressed.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const url = `https://kroki.io/mermaid/png/${base64}`;

https.get(url, (res) => {
  if (res.statusCode === 200) {
    const file = fs.createWriteStream('public/images/exact_workflow_diagram.png');
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('SUCCESS: Image saved to public/images/exact_workflow_diagram.png');
    });
  } else {
    console.error(`Failed to download. Status code: ${res.statusCode}`);
  }
}).on('error', (err) => {
  console.error('Error:', err.message);
});
