<template>
  <div>
    <!-- :onMessageWasSent="onMessageWasSent" -->
    <h3>Your Website Here</h3>
    <p>
      Customers can chat with a support team member using the button in the lower right corner of the page.
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
      :showFile="true"
      :showTypingIndicator="showTypingIndicator"
      :colors="colors"
      :alwaysScrollToBottom="alwaysScrollToBottom"
      :onMessageWasSent="sendMessage" />
  </div>
</template>

<script>
import chatParticipants from '../chatProfiles'
import Header from '../components/Header.vue';
import Footer from '../components/Footer.vue';
import TestArea from '../components/TestArea.vue';
import availableColors from '../colors';

import {EventBus} from '../event-bus.js';
import util from '../util';

EventBus.$on('vue-initialized-customer', ({ chatEngine, store }) => {
  // Channel where each private chat's metadata is stored, so the support agent
  // can see their chat history in the UI
  // don't expose this to clients besides support user client
  const privateChatKeyChannel = 'private-chat-keys-a1';
  const view = window.location.href.includes('support') ? 'support' : 'customer';

  let myUuid = window.localStorage.getItem('chat_engine_customer_uuid');
  let myName = window.localStorage.getItem('chat_engine_customer_name');

  // Store customer identifiers in the browser local storage
  if ((!myUuid || !myName) && view === 'customer') {
    myUuid = util.newUuid();
    myName = util.generateName();
    localStorage.setItem('chat_engine_customer_uuid', myUuid);
    localStorage.setItem('chat_engine_customer_name', myName);
  }

  // This would ideally be set by a view that is behind basic auth
  if (view === 'support') {
    myUuid = 'support';
    myName = 'support';
  }

  const me = {
    name: myName,
    uuid: myUuid,
  };

  /**
   * Execute this function when the Vue instance is created
   */

  chatEngine.connect(me.uuid, me);

  document.addEventListener('beforeunload', function() {
    chatEngine.disconnect();
  });

  chatEngine.on('$.ready', function(data) {
    // store my new user as `me`
    let me = data.me;
    store.commit('setMe', {me});

    // Update support admin's chat history using a PubNub channel as the log
    submitChatKey(me.uuid);

    // Make the new 1:1 private Chat
    let myChat = util.newChatEngineChat(
      store,
      chatEngine,
      {
        chatKey: me.uuid,
        uuid: me.uuid,
      },
      true,
    );

    myChat.on('$.connected', () => {

      store.commit('setCurrentChat', {
        chatKey: me.uuid,
      });

      store.commit('setChatEngineReady', {});
    });
  });


  function submitChatKey() {
    let oldAuthKey = chatEngine.pubnub.getAuthKey();
    chatEngine.pubnub.setAuthKey('customer-auth-key');
    chatEngine.pubnub.publish({
      channel : privateChatKeyChannel,
      message: { 
        uuid: myUuid,
        name: myName,
        time: new Date().getTime()
      }
    });
    chatEngine.pubnub.setAuthKey(oldAuthKey);
  }
});

export default {
  name: 'Customer',
  components: {
    Header,
    Footer,
    TestArea
  },
  data() {
    return {
      participants: chatParticipants,
      titleImageUrl: '',
      // messageList: [],
      newMessagesCount: 0,
      isChatOpen: false,
      showTypingIndicator: '',
      colors: null,
      availableColors,
      chosenColor: null,
      alwaysScrollToBottom: true
    }
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
      state.chats[key].search({
        event: 'message',
        limit: 100,
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
    handleTyping (text) {
      this.showTypingIndicator = text.length > 0 ? this.participants[this.participants.length - 1].id : '';
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
    }
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
</style>
