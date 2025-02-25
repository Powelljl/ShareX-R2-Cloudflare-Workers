# ShareX-R2-Cloudflare-Workers

This repo pairs with the blog post found at https://jross.me/cloudflare-r2-sharex-custom-uploader. It assumes some precursory knowledge about Workers, Cloudflare, and ShareX. If you have any questions, please feel free to create a discussion/issue, or submit a PR with any docs improvements! I want to extend this repo in the future and when R2 is more widely available, and document the process from start to finish.

## Worker and R2 Setup

- Run `wrangler r2 bucket create <bucket name>`. For the purpose of this example, I'll be using `sharex-files`.
- Clone repo (or fork?)
- Edit `wrangler.toml` with your `account_id`, `zone_id`, `route`, and `r2_buckets.bucket_name`
- Generate a random string of characters - this will be used for an `AUTH_KEY` header that we'll send along with ShareX
	- This ensures that only you can upload to your script
- In your GitHub repository, create an `AUTH_KEY` secret, and set its value to the `AUTH_KEY` you just generated
	- This will be used by the GitHub Action to publish the worker
- In your GitHub repository, create a `CF_API_TOKEN` secret, and set its value to a Cloudflare API token with the following permissions:
	- Account - Workers R2 Storage - Edit
	- Account - Workers Tail - Read
	- Account - Workers KV Storage - Edit
	- Account - Workers Scripts - Edit
	- Account - Account Settings - Read
	- Account - User Details - Read
	- Zone - Workers Routes - Edit

	- Then be sure to give it access to the application account/zone resources you want to use
![Cloudflare API token for Wrangler R2 access](docs/cloudflare-api-token.png?raw=true)

- If using GitHub Actions (like this repo), simply push your changes and the worker will be automatically deployed - see your Actions log for any errors.
- (optional) If you want to publish manually, or use some other CI other than GitHub Actions, you will need to manually setup the `AUTH_KEY` secret (via the Workers UI, or `wrangler secret put`), and then run `npm run publish`.


## ShareX Setup

For full documentation on ShareX custom uploaders, please review their documentation at https://getsharex.com/docs/custom-uploader.

- Open Main Window -> Destinations -> Custom Uploader Settings
- New -> Name it `R2` or whatever else you want
- Set the `Destination Type` to `Image uploadere`
- Set the `Method` to `POST`
- Set the `Request URL` to the URL of your worker, with `/upload` appended, such as `https://r2-sharex.jross.me/upload`
- Set the `Body` to `Binary`
- Leave URL paramaters blank
- (optional) Add a new URL paramater called `filename`, and set it to `$filename$`. If this is set, the original filename will be used when storing to R2, otherwise a random ID will be generated
- Add a new header under `Headers` called `x-auth-key`, and set it to the secure string you generated earlier
- Under `Parse Response`, scroll down to `URL`, and set this to `$json:image$`
- Use the testers on the left hand side to test your configuration
- When ready, change your default destination for images (etc.) to `R2`

![ShareX configuration for a custom Cloudflare R2 Uploader](docs/sharex.png?raw=true)

[//]: <> (Commit.)
