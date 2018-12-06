import Vue from 'vue';
import Router from 'vue-router';
import Customer from '@/views/Customer';
import Support from '@/views/Support';
import NotFound from '@/views/404';

Vue.use(Router);

export default new Router({
    routes: [
        {path: '*', component: NotFound},
        {path: '/', component: Customer},
        {path: '/support/', component: Support, beforeEnter: requireAuth},
    ]
});

// See this guide to implement auth:
// https://www.pubnub.com/docs/chat-engine/auth-guide
function requireAuth(to, from, next) {
    // Here you would do something like make an AJAX request to your server
    // to validate a basic auth token, or the like.
    const password = 'open-sesame';

    // Don't do this in production, make a secure authentication flow instead.
    if (password === 'open-sesame') {
        next();
    } else {
        next({
            path: '/404/',
        });
    }
}
