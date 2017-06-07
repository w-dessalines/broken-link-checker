"use strict";
const fixture = require("./fixture");

const {createDeflate, createGzip} = require("zlib");
const {createReadStream} = require("fs");
const escapeStringRegexp = require("escape-string-regexp");
const nock = require("nock");
const {URL} = require("universal-url");



function addDeadMock(...urls)
{
	const error = new Error("mocked ECONNREFUSED");
	const pattern = pathPattern("/path/to/resource.html");

	error.code = "ECONNREFUSED";

	for (let i=0; i<urls.length; i++)
	{
		nock(urls[i])
		.persist().get(pattern).replyWithError(error)
		.persist().head(pattern).replyWithError(error);
	}
}



function addMock(...urls)
{
	for (let i=0; i<urls.length; i++)
	{
		const instance = nock(urls[i]);

		intercept(instance,
		{
			path: ["/", "/index.html"],
			methods:
			{
				all:
				{
					body: stream("/index.html"),
					headers: { "content-type":"text/html" },
					statusCode: 200
				}
			}
		});

		intercept(instance,
		{
			path: "/auth/index.html",
			auth: { user:"user", pass:"pass" },
			methods:
			{
				all:
				{
					body: stream("/auth/index.html"),
					headers: { "content-type":"text/html" },
					statusCode: 200
				}
			}
		});

		intercept(instance,
		{
			path: "/auth/intransitive.html",
			auth: { user:"user2", pass:"pass2" },
			methods:
			{
				all:
				{
					body: stream("/auth/intransitive.html"),
					headers: { "content-type":"text/html" },
					statusCode: 200
				}
			}
		});

		intercept(instance,
		{
			path: "/auth/transitive.html",
			auth: { user:"user", pass:"pass" },
			methods:
			{
				all:
				{
					body: stream("/auth/transitive.html"),
					headers: { "content-type":"text/html" },
					statusCode: 200
				}
			}
		});

		intercept(instance,
		{
			path: "/auth/transitive-redirect.html",
			auth: { user:"user", pass:"pass" },
			methods:
			{
				all:
				{
					headers: { location:"/auth/transitive-redirected.html" },
					statusCode: 302
				}
			}
		});

		intercept(instance,
		{
			path: "/auth/transitive-redirected.html",
			auth: { user:"user", pass:"pass" },
			methods:
			{
				all:
				{
					body: stream("/auth/transitive-redirected.html"),
					headers: { "content-type":"text/html" },
					statusCode: 200
				}
			}
		});

		intercept(instance,
		{
			path: "/circular-redirect/redirect.html",
			methods:
			{
				all:
				{
					headers: { location:"/circular-redirect/redirected.html" },
					statusCode: 302
				}
			}
		});

		intercept(instance,
		{
			path: "/compression/deflate.html",
			methods:
			{
				all:
				{
					body: stream("/compression/deflate.html", "deflate"),
					headers:
					{
						"content-encoding": "deflate",
						"content-type": "text/html"
					},
					statusCode: 200
				}
			}
		});

		intercept(instance,
		{
			path: "/compression/gzip.html",
			methods:
			{
				all:
				{
					body: stream("/compression/gzip.html", "gzip"),
					headers:
					{
						"content-encoding": "gzip",
						"content-type": "text/html"
					},
					statusCode: 200
				}
			}
		});

		intercept(instance,
		{
			path: "/disallowed/header.html",
			methods:
			{
				all:
				{
					body: stream("/disallowed/header.html"),
					headers:
					{
						"content-type": "text/html",
						"x-robots-tag": "nofollow"/*,
						"x-robots-tag: unavailable_after": "1-Jan-3000 00:00:00 EST"*/
					},
					statusCode: 200
				}
			}
		});

		intercept(instance,
		{
			path: "/method-not-allowed/any.html",
			methods:
			{
				all: { statusCode:405 }
			}
		});

		intercept(instance,
		{
			path: "/method-not-allowed/head.html",
			methods:
			{
				get:
				{
					body: stream("/method-not-allowed/head.html"),
					headers: { "content-type":"text/html" },
					statusCode: 200
				},
				head:
				{
					statusCode: 405
				}
			}
		});

		intercept(instance,
		{
			path: "/non-html/empty",
			methods:
			{
				all:
				{
					body: stream("/non-html/empty"),
					statusCode: 200
				}
			}
		});

		intercept(instance,
		{
			path: "/non-html/image.gif",
			methods:
			{
				all:
				{
					body: stream("/non-html/image.gif"),
					headers: { "content-type":"image/gif" },
					statusCode: 200
				}
			}
		});

		// TODO :: rename to "simple" ?
		intercept(instance,
		{
			path: "/normal/fake.html",
			methods:
			{
				all: { statusCode:404 }
			}
		});

		intercept(instance,
		{
			path: "/redirect/redirect.html",
			methods:
			{
				all:
				{
					headers: { location:"/redirect/redirect2.html" },
					statusCode: 302
				}
			}
		});

		intercept(instance,
		{
			path: "/redirect/redirect2.html",
			methods:
			{
				all:
				{
					headers: { location:"/redirect/redirected.html" },
					statusCode: 301
				}
			}
		});

		intercept(instance,
		{
			path: "/robots.txt",
			methods:
			{
				all:
				{
					body: stream("/robots.txt"),
					headers: { "content-type":"text/plain" },
					statusCode: 200
				}
			}
		});

		[
			"/circular/index.html",
			"/circular/no-links.html",
			"/circular/with-links.html",
			"/circular-redirect/redirected.html",
			"/disallowed/header2.html",
			"/disallowed/index.html",
			"/disallowed/meta.html",
			"/disallowed/meta2.html",
			"/disallowed/rel.html",
			"/disallowed/rel2.html",
			"/disallowed/robots-txt.html",
			"/disallowed/robots-txt2.html",
			"/external-redirect/index.html",
			"/external-redirect/redirected.html",
			"/normal/index.html",
			"/normal/no-links.html",
			"/normal/with-links.html",
			"/redirect/index.html",
			"/redirect/redirected.html"
		]
		.forEach(path => intercept(instance,
		{
			path: path,
			methods:
			{
				all:
				{
					body: stream(path),
					headers: { "content-type":"text/html" },
					statusCode: 200
				}
			}
		}));

		// These fixtures require multiple mocks
		if (urls.length >= 2)
		{
			if (i === 0)
			{
				// Redirect first mock to next mock
				// TODO :: make this more explicit in test suite somehow -- special case object for server, created per test?
				intercept(instance,
				{
					path: "/external-redirect/redirect.html",
					methods:
					{
						all:
						{
							headers: { location:new URL("/external-redirect/redirected.html", urls[1]).href },
							statusCode: 302
						}
					}
				});
			}
		}
		else
		{
			// Cannot redirect to another mock -- make sure tests fail
			intercept(instance,
			{
				path: "/external-redirect/redirect.html",
				methods:
				{
					all: { statusCode:500 }
				}
			});
		}
	}
}



function intercept(nockInstance, config)
{
	if (config.methods.all != null)
	{
		config.methods.get  = config.methods.all;
		config.methods.head = config.methods.all;
	}

	if (!Array.isArray(config.path))
	{
		config.path = [config.path];
	}

	config.path.forEach(path =>
	{
		const pattern = pathPattern(path);

		if (config.methods.get != null)
		{
			let interception = nockInstance.persist().get(pattern);

			if (config.auth != null)
			{
				interception = interception.basicAuth(config.auth);
			}

			interception.reply((url, requestBody) =>
			{
				const body = (typeof config.methods.get.body === "function") ? config.methods.get.body() : null;

				return [config.methods.get.statusCode, body, config.methods.get.headers];
			});
		}

		if (config.methods.head != null)
		{
			let interception = nockInstance.persist().head(pattern);

			if (config.auth != null)
			{
				interception = interception.basicAuth(config.auth);
			}

			interception.reply((url, requestBody) =>
			{
				return [config.methods.head.statusCode, null, config.methods.head.headers];
			});
		}
	});
}



function pathPattern(path)
{
	path = escapeStringRegexp(path);

	path += "(?:\\?(?:.+)?)?";  // adds support for possible queries
	path += "(?:\\#(?:.+)?)?";  // adds support for possible hashes

	return new RegExp(`^${path}$`);
}



function removeMocks()
{
	nock.cleanAll();
}



function stream(path, compression=false)
{
	return function()
	{
		const stream = createReadStream( fixture.path(path) );

		if (compression === "deflate")
		{
			return stream.pipe(createDeflate());
		}
		else if (compression === "gzip")
		{
			return stream.pipe(createGzip());
		}
		else
		{
			return stream;
		}
	};
}



module.exports =
{
	start: addMock,
	startDead: addDeadMock,
	stop: removeMocks
};
