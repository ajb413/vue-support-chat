<template>
  <div>
    <h3>Your Website Here</h3>
    <p class="website-text">
      <b>Customers</b> can chat with a support team member using the button in the lower right corner of the page.
      <br>
      <br>
      <b>Support Team</b> members at your company can <router-link to="/support">sign in to support chat duty here</router-link>.
    </p>
    <beautiful-chat
      :participants="participants"
      :titleImageUrl="titleImageUrl"
      :messageList="messageList"
      :newMessagesCount="newMessagesCount"
      :isOpen="isChatOpen"
      :close="closeChat"
      :open="openChat"
      :showEmoji="true"
      :showFile="false"
      :showTypingIndicator="showTypingIndicator"
      :colors="colors"
      :alwaysScrollToBottom="alwaysScrollToBottom"
      :onMessageWasSent="sendMessage" />
  </div>
</template>

<script>
import chatParticipants from '../chatProfiles'
import availableColors from '../colors';

import {EventBus} from '../event-bus.js';
import util from '../util';

const stateRoute = '?route=chat_state';

EventBus.$on('vue-initialized-customer', ({ chatEngine, store }) => {
  const view = window.location.href.includes('support') ? 'support' : 'customer';

  let myUuid = window.localStorage.getItem('chat_engine_customer_uuid');
  let myName = window.localStorage.getItem('chat_engine_customer_name');

  // Store customer identifiers in the browser local storage
  if ((!myUuid || !myName) && view === 'customer') {
    myUuid = util.newUuid();
    myName = util.generateName();
    console.log('no name', myUuid, myName)
    localStorage.setItem('chat_engine_customer_uuid', myUuid);
    localStorage.setItem('chat_engine_customer_name', myName);
  }

  const meState = {
    name: myName,
    uuid: myUuid,
    key: myUuid,
  };

  /**
   * Execute this function when the Vue instance is created
   */

  chatEngine.connect(meState.uuid, meState, 'customer-auth-key');

  document.addEventListener('beforeunload', function() {
    chatEngine.disconnect();
  });

  chatEngine.on('$.ready', function(data) {
    // store my new user as `me`
    let me = data.me;
    store.commit('setMe', {me});

    // Make the new 1:1 private Chat
    let myChat = util.newChatEngineChat(
      store,
      chatEngine,
      meState,
      true,
    );

    myChat.on('$.connected', () => {

      store.commit('setCurrentChat', {
        key: me.uuid,
      });

      // Gives this chat information to the support chat user,
      // even if they are offline
      addNewUserToSupportChats({
        key: myUuid,
        uuid: myUuid,
        name: myName,
        time: new Date()
      });

      store.commit('setChatEngineReady', {});
    });
  });
});

function addNewUserToSupportChats(userState) {
  util.ajax(window.$supportAPI + stateRoute, 'PUT', {
    body: userState
  });
}

export default {
  name: 'Customer',
  components: {},
  data() {
    return {
      participants: chatParticipants,
      titleImageUrl: '',
      newMessagesCount: 0,
      isChatOpen: false,
      showTypingIndicator: '',
      colors: null,
      availableColors,
      chosenColor: null,
      alwaysScrollToBottom: true
    }
  },
  mounted() {
    const textInput = document.getElementsByClassName('sc-user-input--text')[0];
    textInput.onkeyup = this.handleTyping;
  },
  created() {
    this.setColor('blue');

    // Add a typing indicator visual to the UI
    EventBus.$on('chat-engine-ready', () => {
      this.ceCreated();
    });
  },
  methods: {
    ceCreated() {
      const state = this.$store.state;
      const key = state.currentChat;

      // Get old messages from the ChatEngine Chat using PubNub History
      state.chats[key].search({
        event: 'message',
        limit: 100,
      });

      // Register the typing indicator events
      EventBus.$on('typing-start', () => {
        this.showTypingIndicator = 'support';
      });

      EventBus.$on('typing-stop', () => {
        this.showTypingIndicator = '';
      });

    },
    sendMessage(messageObject) {
      const state = this.$store.state;
      const currentChatObject = state.chats[state.currentChat];

      // Only display typing indicator in private 1:1 chats
      if (currentChatObject.isPrivate && currentChatObject.typingIndicator) {
        currentChatObject.typingIndicator.stopTyping();
      }

      // Send textarea input as message with ChatEngine
      // Use Vuex (in store.js) to send the message
      let newMessage = {
        chat: this.$store.state.currentChat, // a chat key
        message: {
          text: messageObject.data.text || messageObject.data.emoji,
        },
      }

      this.$store.dispatch('sendMessage', newMessage);

      // Reset the text input
      // event.target.value = '';

      if (
        messageObject &&
        messageObject.data &&
        messageObject.data.text &&
        messageObject.data.text.length > 0
      ) {
        this.newMessagesCount = this.isChatOpen ? this.newMessagesCount : this.newMessagesCount + 1
        // this.onMessageWasSent({ author: 'support', type: 'text', data: { text } })
        // this.messageList = [ ...this.messageList, messageObject ]
      }
    },
    handleTyping () {
      const state = this.$store.state;
      const currentChatObject = state.chats[state.currentChat];

      // Trigger the typing indicator start
      if (
        currentChatObject.typingIndicator &&
        event.key !== 'Enter'
      ) {
        currentChatObject.typingIndicator.startTyping();
      }
    },
    // onMessageWasSent (message) {
      // this.messageList = [ ...this.messageList, message ]
    // },
    openChat () {
      this.isChatOpen = true
      this.newMessagesCount = 0
    },
    closeChat () {
      this.isChatOpen = false
    },
    setColor (color) {
      this.colors = this.availableColors[color]
      this.chosenColor = color
    },
  },
  computed: {
    linkColor() {
      return this.chosenColor === 'dark' ? this.colors.sentMessage.text : this.colors.launcher.bg
    },
    backgroundColor() {
      return this.chosenColor === 'dark' ? this.colors.messageList.bg : '#fff'
    },
    messageList() {
      return this.$store.state.chatMessages[this.$store.state.currentChat];
    },
  }
}
</script>

<style>
  div.sc-chat-window.opened {
    text-align: left;
  }

  h3, .website-text {
    margin: 80px 0px;
  }
</style>
