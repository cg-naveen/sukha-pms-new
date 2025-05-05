import MailerLite from '@mailerlite/mailerlite-nodejs';

// Initialize MailerLite client
const apiKey = process.env.MAILERLITE_API_KEY;
if (!apiKey) {
  console.error('MAILERLITE_API_KEY environment variable is not set');
  process.exit(1);
}

const mailerLite = new MailerLite({
  api_key: apiKey,
});

// Print out the available methods for debugging
console.log('Available methods on MailerLite instance:');
console.log(Object.keys(mailerLite));

for (const key of Object.keys(mailerLite)) {
  console.log(`Methods in ${key}:`, Object.keys(mailerLite[key]));
}

// Let's look at the subscribers methods more specifically
console.log("\nSubscribers methods:");
const subscribersMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(mailerLite.subscribers))
  .filter(name => name !== 'constructor');
console.log(subscribersMethods);

// Check campaigns methods
console.log("\nCampaigns methods:");
const campaignsMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(mailerLite.campaigns))
  .filter(name => name !== 'constructor');
console.log(campaignsMethods);

// Check more modules for any send email capability
for (const module of ['stats', 'batches', 'webhooks']) {
  console.log(`\n${module} methods:`);
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(mailerLite[module]))
    .filter(name => name !== 'constructor');
  console.log(methods);
}