<template>
  <div>
    <div
      id="username-input-modal"
      :class="hideSignInModal + ' modal-background'">
        <div class="user-input-modal">
            <h3>Support Sign In</h3>
            <p>
                Username is "support"
                <br>
                and password is "sesame"
            </p>
            <input v-model="username" autofocus placeholder="support" id="username-input" type="text" maxlength="80" class="modal-text-input">
            <input v-model="password" @keyup.enter="signin" id="pass-input" type="password" maxlength="80" class="modal-text-input">
            <div @click="signin" id="join-button" class="modal-button">
                Sign In
            </div>
        </div>
    </div>
    <div class="spacer"></div>
    <chat-container/>
  </div>
</template>

<script>
import ChatContainer from '@/components/support/ChatContainer';
import {EventBus} from '../event-bus.js';
import util from '../util';

const signInRoute = '?route=get_auth_key';
const stateRoute = '?route=chat_state';
let store, chatEngine;

EventBus.$on('vue-initialized-support', (payload) => {
  chatEngine = payload.chatEngine;
  store = payload.store;
});

export default {
  name: 'Support',
  components: {
    ChatContainer,
  },
  data() {
    return {
      username: '',
      password: '',
      signedIn: false,
      basicAuthToken: '',
    }
  },
  mounted(){
    let componentThis = this;

    const supportUser = {
      name: 'support',
      uuid: 'support',
    };

    EventBus.$on('init-support-chat', () => {
      chatEngine.connect(supportUser.uuid, supportUser, 'support-user-auth-key');

      document.addEventListener('beforeunload', function() {
        chatEngine.disconnect();
      });

      chatEngine.on('$.ready', function(data) {
        // store my new user as `me`
        let me = data.me;
        me._setState = false;
        store.commit('setMe', {me});

        componentThis.getSupportUserState().then((newMe) => {
          me.update(newMe);

          let keys = Object.keys(newMe.chats);
          let friends = [];

          keys.forEach((key) => {
            if (!store.state.chats[key]) {
              let chat = util.newChatEngineChat(
                store,
                chatEngine,
                newMe.chats[key],
                true,
              );

              chat.on('$.connected', () => {
                store.state.chats[key].search({
                  event: 'message',
                  limit: 100,
                  reverse: true
                });
              });

            }

            friends.push(newMe.chats[key]);
          });

          // Add this friend to the client's friend list
          store.commit('setFriends', {
            friends,
          });

          store.commit('setMe', {me});
        });

        // when a user comes online
        chatEngine.on('$.online.join', (data) => {
          let time = new Date();
          let key = data.user.state.uuid;
          let name = data.user.state.name;

          // If the chat already exists, don't make a new one
          if (store.state.chats[key] || key === 'support') {
            return;
          }

          let newChat = {};

          newChat.key = newChat.uuid = key;
          newChat.time = time.getTime();
          newChat.name = name;

          // Add this chat to the support user object
          if (me.state.chats) {
            me.state.chats[key] = {
              key,
              name,
              time
            };
          } else {
            me.state.chats = {};
            me.state.chats[key] = {
              key,
              name,
              time
            };
          }

          componentThis.setSupportUserState(me.state)
          .then((s) => {
            me.update(s);
            store.commit('setMe', {me});
          });


          // Make the new 1:1 private Chat
          let chat = util.newChatEngineChat(
            store,
            chatEngine,
            newChat,
            true,
          );

          chat.on('$.connected', () => {
            store.state.chats[key].search({
              event: 'message',
              limit: 100,
              reverse: true
            });
          });
        });
      });
    });
  },
  methods: {
    basic(username, password) {
        return `Basic ${window.btoa(`${username}:${password}`)}`;
    },
    setSupportUserState(userState) {
      return new Promise((resolve, reject) => {
        util.ajax(window.$supportAPI + stateRoute, 'POST', {
          headers: {
            Authorization: this.basicAuthToken
          },
          body: userState
        }).then((response) => {
          return resolve(response);
        }).catch((err) => {
          console.error('setSupportChats', err);
          return reject();
        });
      });
    },
    getSupportUserState() {
      return new Promise((resolve, reject) => {
        util.ajax(window.$supportAPI + stateRoute, 'GET', {
          headers: {
            Authorization: this.basicAuthToken
          }
        }).then((response) => {
          return resolve(response);
        }).catch((err) => {
          console.error('getSupportChats', err)
          return reject();
        });
      });
    },
    signin() {
      this.basicAuthToken = this.basic(this.username, this.password);
      util.ajax(window.$supportAPI + signInRoute, 'GET', {
        headers: {
          Authorization: this.basicAuthToken
        }
      }).then((response) => {
        console.log('signin worked!', response);
        this.signedIn = true;
        EventBus.$emit('init-support-chat');
      }).catch((err) => {
        // Display a wrong password error to the user
        console.error('signin Error', err);
      });
    }
  },
  computed: {
    hideSignInModal() {
      return this.signedIn ? 'hide' : '';
    },
  },
};

</script>

<style>
#app {
  font-family: Helvetica;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #454d54;
}

#app div.hide {
  display: none;
}

body {
    margin: 0px;
}

.modal-background {
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: 2;
}

.user-input-modal h3 {
    margin: 15px auto;
}

.user-input-modal p {
    margin: 0px auto 20px auto;
}

.user-input-modal {
    position: relative;
    top: 50%;
    transform: translateY(-50%);
    max-width: 400px;
    min-width: 300px;
    overflow: hidden;
    margin: auto;
    padding: 15px;
    box-sizing: border-box;
    background-color: #363D48;
    border: solid 1px #e6e6e6;
    border-radius: 8px;
    color: #FFFFFF;
    text-align: center;
}

.user-input-modal .modal-button {
    display: inline-block;
    width: 100px;
    margin: 0px 10px 20px 10px;
    padding: 5px;
    box-sizing: border-box;
    background-color: #101620;
    color: #e6e6e6;
    border: solid 1px #6D7582;
    border-radius: 3px;
    user-select: none;
    cursor: pointer;
}

.user-input-modal .modal-button:hover {
    color: #FFFFFF;
    border: solid 1px #e6e6e6;
}

.user-input-modal .modal-button.disabled {
    opacity: 0.2;
}

.user-input-modal .modal-button.disabled:hover {
    color: #e6e6e6;
    border: solid 1px #6D7582;
}

.user-input-modal .modal-text-input {
    width: 80%;
    padding: 0px 5px;
    margin: 0px auto 20px auto;
    line-height: 24pt;
    outline: none;
    font-size: 14px;
    border: solid 1px #e6e6e6;
    background-color: #6D7582;
    border-radius: 3px;
    color: #FFFFFF;
    font-family: inherit;
    text-align: center;
}

.spacer {
  padding-top: 40px;
}

/* Loading Ripple Animation */
/* Generated by loading.io */
@keyframes lds-ripple {
  0% {
    top: 96px;
    left: 96px;
    width: 0;
    height: 0;
    opacity: 1;
  }
  100% {
    top: 8px;
    left: 8px;
    width: 176px;
    height: 176px;
    opacity: 0;
  }
}
@-webkit-keyframes lds-ripple {
  0% {
    top: 96px;
    left: 96px;
    width: 0;
    height: 0;
    opacity: 1;
  }
  100% {
    top: 8px;
    left: 8px;
    width: 176px;
    height: 176px;
    opacity: 0;
  }
}
.lds-ripple {
  position: relative;
}
.lds-ripple div {
  box-sizing: content-box;
  position: absolute;
  border-width: 4px;
  border-style: solid;
  opacity: 1;
  border-radius: 50%;
  -webkit-animation: lds-ripple 2.6s cubic-bezier(0, 0.2, 0.8, 1) infinite;
  animation: lds-ripple 2.6s cubic-bezier(0, 0.2, 0.8, 1) infinite;
}
.lds-ripple div:nth-child(1) {
  border-color: #000000;
}
.lds-ripple div:nth-child(2) {
  border-color: rgba(0%,0%,0%,0.675);
  -webkit-animation-delay: -1.3s;
  animation-delay: -1.3s;
}
.lds-ripple {
  width: 36px !important;
  height: 36px !important;
  -webkit-transform: translate(-18px, -18px) scale(0.18) translate(18px, 18px);
  transform: translate(-18px, -18px) scale(0.18) translate(18px, 18px);
}
</style>
