"use strict";
const checkUrl     = require("../internal/checkUrl");
const Link         = require("../internal/Link");
const parseOptions = require("../internal/parseOptions");

const {EventEmitter} = require("events");
const RequestQueue = require("limited-request-queue");
const URLCache = require("urlcache");



class UrlChecker extends EventEmitter
{
	constructor(options)
	{
		super();

		options = parseOptions(options);

		this.cache = new URLCache(
		{
			maxAge: options.cacheMaxAge,
			normalize: false  // TODO :: should be true when not used by `HtmlChecker`
		});

		this.linkQueue = new RequestQueue(
		{
			maxSockets:        options.maxSockets,
			maxSocketsPerHost: options.maxSocketsPerHost,
			rateLimit:         options.rateLimit
		})
		.on("item", (url, data, done) =>
		{
			checkUrl(data.link, data.auth, this.cache, options)
			.then(result => this.emit("link", result, data.customData))
			// Auto-starts next queue item, if any
			// Fires "end", if not
			.then(() => done())
			.catch(error => this.emit("error", error));
		})
		.on("end", () => this.emit("end"));
	}



	clearCache()
	{
		this.cache.clear();
		return this;
	}



	dequeue(id)
	{
		const success = this.linkQueue.dequeue(id);

		this.emit("queue");

		return success;
	}



	// `auth` is undocumented and for internal use only
	enqueue(url, customData, auth={})
	{
		let link;

		// Undocumented internal use: `enqueue(Link)`
		if (Link.isLink(url))
		{
			link = url;
		}
		// Documented use: `enqueue(url)`
		// or erroneous and let linkQueue sort it out
		else
		{
			// TODO :: if `url` contains auth, it'll need to override `auth`
			link = Link.resolve(Link.create(), url);
		}

		const id = this.linkQueue.enqueue(link.url.rebased, { auth, customData, link });

		this.emit("queue");

		return id;
	}



	get isPaused()
	{
		return this.linkQueue.isPaused;
	}



	get numActiveLinks()
	{
		return this.linkQueue.numActive;
	}



	get numQueuedLinks()
	{
		return this.linkQueue.numQueued;
	}



	pause()
	{
		this.linkQueue.pause();
		return this;
	}



	resume()
	{
		this.linkQueue.resume();
		return this;
	}



	__getCache()
	{
		return this.cache;
	}
}



module.exports = UrlChecker;
