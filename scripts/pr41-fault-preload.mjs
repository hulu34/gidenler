// Fault injection is confined to the synthetic localhost acceptance process.
if(process.env.GIDENLER_TEST_ONLY!=='pr41-20261113'||process.env.VERCEL||new URL(process.env.DATABASE_URL).hostname!=='127.0.0.1')throw Error('Fault injector is isolated-test only');
const realFetch=globalThis.fetch;
globalThis.fetch=async function(input,init){
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 if(url.startsWith('https://www.youtube.com/oembed?')&&url.includes('gIdEnLeR404')){console.error('[pr41 synthetic fault] YouTube oEmbed timeout');throw new DOMException('Synthetic upstream timeout','TimeoutError')}
 return realFetch(input,init);
};
