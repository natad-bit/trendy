console.log('Starting server...');

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const cheerio = require('cheerio');
var rp = require('request-promise');

const scrapingBeeApiKey = process.env.SCRAPINGBEE_API_KEY;
if (!scrapingBeeApiKey) {
  console.error('Missing SCRAPINGBEE_API_KEY in environment. Create a .env file with SCRAPINGBEE_API_KEY=<your key>.');
  process.exit(1);
}

const options = {
    uri: 'https://app.scrapingbee.com/api/v1',
    qs: {
        api_key: scrapingBeeApiKey,
        url: 'https://www.reddit.com/r/hamburg/'
    }
};

rp(options).then(response => {
    console.log('=== RAW HTML RESPONSE ===');
    console.log(response.substring(0, 1000)); // Print first 1000 chars
    
    console.log('\n=== PARSING WITH CHEERIO ===');
    const $ = cheerio.load(response);
    
    // Parse posts
    const posts = [];
    $('article').each((index, element) => {
        const title = $(element).find('h3').text().trim();
        const score = $(element).find('[aria-label*="upvote"]').parent().text().trim();
        const comments = $(element).find('span:contains("Comment")').text().trim();
        const author = $(element).find('a[href*="/user/"]').text().trim();
        const link = $(element).find('a[data-click-id="body"]').attr('href');
        
        console.log(`\n--- Post ${index + 1} ---`);
        console.log('Title:', title);
        console.log('Score:', score);
        console.log('Comments:', comments);
        console.log('Author:', author);
        console.log('Link:', link);
        
        if (title) {
            posts.push({ title, score, comments, author, link });
        }
    });
    
    console.log('\n=== EXTRACTED DATA ===');
    console.log(JSON.stringify(posts, null, 2));
    console.log(`\nTotal posts found: ${posts.length}`);
}).catch(error => {
    console.log('Error:', error);
})


// const stopWords = new Set([
//   "a","the","i","you","he","she","it","we","they",
//   "and","or","but","if","then","because","as",
//   "of","at","by","for","with","about","against",
//   "between","into","through","during","before","after",
//   "above","below","to","from","up","down","in","out",
//   "on","off","over","under","again","further","once",
//   "here","there","when","where","why","how",
//   "all","any","both","each","few","more","most",
//   "other","some","such","no","nor","not","only",
//   "own","same","so","than","too","very","that","this","these","those","my","your","his","her","its","our","their", 
//   "can","will","just","don","should","now", "is", "are", "was", "were", "be", "been", "being",
// ]);

