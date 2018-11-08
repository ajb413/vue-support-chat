/* eslint-disable */
// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue';
import App from './App';
import router from './router';
import Chat from 'vue-beautiful-chat';
import store from './store';
import VueChatEngine from 'vue-chat-engine';
import ChatEngineCore from 'chat-engine';
import util from './util';
import {EventBus} from './event-bus.js';

Vue.config.productionTip = false;

// Plugin Vue Beautiful Chat for the customer UI.
Vue.use(Chat, {});

// Initialize ChatEngine with PubNub - Remember to activate ChatEngine first!
const publishKey = '_YOUR_PUBLISH_KEY_HERE_';
const subscribeKey = '_YOUR_SUBSCRIBE_KEY_HERE_';

window.$supportAPI = '_YOUR_FUNCTIONS_ENDPOINT_URL_HERE_';

if (!publishKey || !subscribeKey) {
    console.error('ChatEngine: PubNub Keys are missing.');
}

const chatEngine = ChatEngineCore.create({
    publishKey,
    subscribeKey,
});

// Plugin ChatEngine to Vue. Store methods will fire on ChatEngine events.
Vue.use(VueChatEngine, { chatEngine, store });

function created() {
    const view = window.location.href.includes('support') ? 'support' : 'customer';
    EventBus.$emit('vue-initialized-' + view, { chatEngine, store });
}

/* eslint-disable no-new */
new Vue({
    el: '#app',
    store,
    components: {App},
    template: '<App/>',
    created,
    router,
});
