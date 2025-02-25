import {Router} from 'itty-router';

const router = Router();

// handle authentication
const authMiddleware = (request, env) => {
	const url = new URL(request.url);
	if(request.headers?.get("x-auth-key") !== env.AUTH_KEY && url.searchParams.get("authkey") !== env.AUTH_KEY){
		return new Response(JSON.stringify({
			success: false,
			error: 'Missing auth',
		}), {
			status: 401,
			headers: {
				"content-type": "application/json",
			},
		});
	}
};

// handle upload
router.post("/upload", authMiddleware, async (request, env) => {
	const url = new URL(request.url);
	let fileslug = url.searchParams.get('filename');
	if(!fileslug){
		// generate random filename UUID if not set
		fileslug = crypto.randomUUID();
	}
	const date = new Date();
	const folder = `${date.getFullYear()}/${('0' + date.getMonth()).slice(-2)}`;
	const filename = `${folder}/${fileslug}`;

	// ensure content-length and content-type headers are present
	const contentType = request.headers.get('content-type');
	const length = request.headers.get('content-length');
	if(!length){
		return new Response(JSON.stringify({
			success: false,
			message: "content-length and content-type are required",
		}), {
			status: 400,
			headers: {
				"content-type": "application/json",
			},
		});
	}

	// write to R2
	try{
		await env.R2_BUCKET.put(filename, request.body, {
			httpMetadata: {
				contentType: contentType,
			},
		});
	}catch(error){
		return new Response(JSON.stringify({
			success: false,
			message: "Error occured writing to R2",
			error: {
				name: error.name,
				message: error.message,
			},
		}), {
			status: 500,
			headers: {
				"content-type": "application/json",
			},
		});
	}

	// return the image url to ShareX
	const returnUrl = new URL(request.url);
	returnUrl.searchParams.delete('filename');
	returnUrl.pathname = `/file/${filename}`;
	return new Response(JSON.stringify({
		success: true,
		image: returnUrl.href,
	}), {
		headers: {
			"content-type": "application/json",
		},
	});
});

// handle file retrieval
const getFile = async (request, env, ctx) => {
	const url = new URL(request.url);
	const id = url.pathname.slice(6);
	console.log('Lookup', id);
	if(!id){
		return new Response(JSON.stringify({
			success: false,
			error: 'Missing ID',
		}), {
			status: 404,
			headers: {
				"content-type": "application/json",
			},
		});
	}
	// try matching from cache first
	const cache = caches.default;
	let response = await cache.match(request);
	if(!response){
		// no cache match, try reading from R2
		const file = await env.R2_BUCKET.get(id);
		if(file === null){
			return new Response(JSON.stringify({
				success: false,
				error: 'Object Not Found',
			}), {
				status: 404,
				headers: {
					"content-type": "application/json",
				},
			});
		}

		response = new Response(await file.arrayBuffer(), {
			headers: {
				'cache-control': 'public, max-age=604800',
				'content-type': file.httpMetadata?.contentType,
				'etag': file.httpEtag,
			},
		});

		// store in cache asynchronously, so to not hold up the request
		ctx.waitUntil(cache.put(request, response.clone()));
	}
	// return uploaded image, etc.
	return response;
};
router.get("/upload/:id", getFile);
router.get("/file/*", getFile);

router.get('/files/list', authMiddleware, async (request, env) => {
	const items = await env.R2_BUCKET.list({limit: 1000});
	return new Response(JSON.stringify(items, null, 2), {
		headers: {
			'content-type': 'application/json',
		},
	});
});

// 404 everything else
router.all('*', () => new Response(JSON.stringify({
	success: false,
	error: 'Not Found',
}), {
	status: 404,
	headers: {
		"content-type": "application/json",
	},
}));

export {router};