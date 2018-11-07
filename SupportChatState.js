export default (request, response) => {

    const db = require('kvstore');
    const pubnub = require('pubnub');
    const xhr = require('xhr');
    const crypto = require('crypto');
    const queryStringCodec = require('codec/query_string');
    const base64Codec = require('codec/base64');
    const vault = require('vault');

    response.headers['Access-Control-Allow-Origin'] = '*';
    response.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept';
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE';

    // Choose route based on request.params and request.method
    // Execute the controller function in the controllers object
    const route = request.params.route;
    const method = request.method.toLowerCase();

    const body = JSON.parse(request.body);

    let controllers = {
        index: {},
        chat_state: {},
        get_auth_key: {}
    };

    // Response helpers
    let allow = () => {
        response.status = 200;
        return response.send();
    };

    let unauthorized = () => {
        response.status = 401;
        return response.send();
    };

    let badRequest = () => {
        response.status = 400;
        return response.send();
    };

    let serverError = (error) => {
        console.error(error);
        response.status = 500;
        return response.send();
    };

    let authPolicy = () => {
        return new Promise((resolve) => {
            let [username, password] = ['',''];

            if (
                request.headers &&
                request.headers.authorization &&
                typeof request.headers.authorization === 'string'
            ) {
                let basicHeader = request.headers.authorization;
                let basicToken = basicHeader.split(' ');
                let basicEncoded = basicToken.length === 2 ? basicToken[1] : '';
                let basicConcatenation = base64Codec.atob(basicEncoded);
                let userPassArray = basicConcatenation.split(':');
                userPassArray = userPassArray.length === 2 ? userPassArray : ['',''];
                [username, password] = userPassArray;
            }

            // You can do this more elegantly using the PubNub Functions Vault
            // Vault securely stores keys and removes them from source code
            if (username === 'support' && password === 'sesame') {
                resolve(true);
            } else {
                resolve(false);
            }
        }).catch(serverError);
    };

    // Unprotected route, always returns 200
    controllers.index.get = () => {
        return allow();
    };

    controllers.chat_state.get = () => {
        return authPolicy().then((isAuthorized) => {
            if (!isAuthorized) {
                return unauthorized();
            }
            return db.get('support_user_state').then((supportStateObject) => {
                if (!supportStateObject) {
                    response.status = 200;
                    return response.send({
                        name: 'support',
                        uuid: 'support',
                        chats: {},
                    });
                } else {
                    response.status = 200;
                    return response.send(supportStateObject);
                }
            });
        }).catch((error) => {
            return serverError(error);
        });
    };

    controllers.chat_state.post = () => {
        return authPolicy().then((isAuthorized) => {
            if (!isAuthorized) {
                return unauthorized();
            }

            // Check for bad request body
            if (
                !body ||
                typeof body !== 'object' ||
                !body.chats ||
                typeof body.chats !== 'object' ||
                Array.isArray(body.chats)
            ) {
                return badRequest();
            }

            let chatKeys = Object.keys(body.chats);
            return db.get('support_user_state').then((supportStateObject) => {
                if (!supportStateObject) {
                    db.set('support_user_state', body);
                    response.status = 200;
                    return response.send(body);
                } else {
                    chatKeys.forEach((key) => {
                        supportStateObject.chats[key] = body.chats[key];
                    });

                    db.set('support_user_state', supportStateObject);

                    response.status = 200;
                    return response.send(supportStateObject);
                }
            });
        });
    };

    controllers.get_auth_key.get = () => {
        return authPolicy().then((isAuthorized) => {
            if (!isAuthorized) {
                return unauthorized();
            } else {
                // The secret auth key for the ChatEngine support user.
                // Store the key in the Functions Vault, not source code.
                response.status = 200;
                return response.send('support-secret-auth-key');
            }
        });
    };

    controllers.chat_state.put = () => {
        if (
            !body ||
            !body.key ||
            typeof body.key !== 'string' ||
            !body.name ||
            typeof body.name !== 'string'
        ) {
            return badRequest();
        } else {
            let time = new Date();
            return db.get('support_user_state').then((supportStateObject) => {
                if (!supportStateObject) {
                    db.set('support_user_state', {
                        name: 'support',
                        uuid: 'support',
                        chats: {
                            [body.key]: {
                                key: body.key,
                                name: body.name,
                                time,
                            }
                        }
                    });
                    response.status = 200;
                    return response.send();
                } else {
                    supportStateObject.chats[body.key] = {
                        key: body.key,
                        name: body.name,
                        time: body.time,
                    };

                    db.set('support_user_state', supportStateObject);

                    response.status = 200;
                    return response.send();
                }
            });
        }
    };

    // GET request with empty route returns the homepage
    // If a requested route or method for a route does not exist, return 404
    if (!route && method === 'get') {
        return controllers.index.get();
    } else if (controllers[route] && controllers[route][method]) {
        return controllers[route][method]();
    } else {
        response.status = 404;
        return response.send();
    }
};
