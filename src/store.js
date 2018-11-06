/* eslint-disable */
import Vue from 'vue';
import Vuex from 'vuex';
import {EventBus} from './event-bus.js';

Vue.use(Vuex);

const state = {
  chats: {},
  chatMessages: {},
  currentChat: '',
  friends: [],
  me: {},
};

const mutations = {
  setMe(state, {me}) {
    state.me = me;
  },
  setChatEngineReady(state) {
    state.chatEngineReady = true;
    EventBus.$emit('chat-engine-ready', {});
  },
  setCurrentChat(state, {key}) {
    state.currentChat = key;
  },
  setFriends(state, {friends}) {
    for (let friend of friends) {
      let alreadyInArray = state.friends.find(alreadyFriend => {
        return alreadyFriend.key === friend.key;
      });

      if (!alreadyInArray) {
        state.friends.push(friend);
      }
    }
  },
  newChat(state, {chat}) {
    if (!chat.key) {
      console.error('No chat.key defined on the new Chatengine chat Object');
      return;
    }
    state.chats[chat.key] = chat;
  },
  CHATENGINE_message(state, {event, sender, chat = {}, data, timetoken}) {
    // sender.uuid !== 'support' ? console.log(sender.uuid) : null;
    let key = chat.key;

    if (!state.chatMessages[key]) {
      Vue.set(state.chatMessages, key, []);
    }

    let who = sender.uuid === 'support' ? 'support' : 'me';
    let author = who;

    let message = {
      timetoken,
      author,
      type: 'text',
      who,
      data
    };

    state.chatMessages[key].push(message);
    state.chatMessages[key].sort((msg1, msg2) => {
      return msg1.timetoken > msg2.timetoken ? 1 :
        msg1.timetoken === msg2.timetoken ? 0 : -1;
    });
  },
};

const actions = {
  sendMessage(context, {chat, message}) {
    // emit the `message` event to everyone in the Chat
    context.state.chats[chat].emit('message', message);
  },
};

const getters = {
  getMyUuid: (state) => state.me.uuid,
  getFriends: (state) => state.friends,
  getChatEngineReady: (state) => state.chatEngineReady,
};

export default new Vuex.Store({
  state,
  getters,
  actions,
  mutations,
});
