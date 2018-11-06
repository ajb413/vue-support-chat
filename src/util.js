import typingIndicator from 'chat-engine-typing-indicator';
import {EventBus} from './event-bus.js';

/**
 * Makes a new, private ChatEngine Chat and adds it to the global Vuex store.
 *
 * @param {Object} store Global Vuex store object.
 * @param {Object} chatEngine ChatEngine client.
 * @param {Object} friend Friend settings like avatar, key, name.
 * @param {Boolean} private_ True will make the Chat a private Chat.
 *
 * @return {Object} Chat object that was initialized and added to the store.
 */
function newChatEngineChat(store, chatEngine, friend, private_) {
  // Make a new 1:1 private chat.
  const newChat = new chatEngine.Chat(friend.key, private_);

  // Add the key to the Chat object for Vue UI use
  newChat.key = friend.key;

  // Add the Typing Indicator ChatEngine plugin to private 1:1 chats
  if (private_) {
    _addTypingIndicator(newChat);
  }

  // If there is no name, make one with the UUID
  if (!friend.name) {
    friend.name = `No Name`;
  }

  // Add this friend to the client's friend list
  store.commit('setFriends', {
    friends: [friend],
  });

  // Add this chat to the global state
  store.commit('newChat', {
    chat: newChat,
  });

  return newChat;
}

/**
 * Adds the ChatEngine Typing indicator plugin and initializes the events
 *     that update the UI via the Vue Event Bus.
 *
 * @param {Object} chat Chat object to add the typing indicator to.
 */
function _addTypingIndicator(chat) {
  chat.plugin(typingIndicator({
    timeout: 2000, // MS after final keyup when stopTyping fires
  }));

  chat.on('$typingIndicator.startTyping', (event) => {
    const chat = event.chat;
    const me = event.sender.name === 'Me' ? true : false;

    // Only fire the UI changing event if the sender is not Me
    if (!me) {
      // Handler in Chat Log Component (components/ChatLog.vue)
      EventBus.$emit('typing-start', chat.key);
    }
  });

  chat.on('$typingIndicator.stopTyping', (event) => {
    const chat = event.chat;
    const me = event.sender.name === 'Me' ? true : false;

    // Only fire the UI changing event if the sender is not Me
    if (!me) {
      // Handler in Chat Log Component (components/ChatLog.vue)
      EventBus.$emit('typing-stop', chat.key);
    }
  });
}

/**
 * Makes a new, version 4, universally unique identifier (UUID). Written by
 *     Stack Overflow user broofa
 *     (https://stackoverflow.com/users/109538/broofa) in this post
 *     (https://stackoverflow.com/a/2117523/6193736).
 *
 * @returns {string} A version 4 compliant UUID.
 */
function newUuid() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(
        /[018]/g,
        (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4)
            .toString(16)
    );
}

/**
 * Make an HTTP request request wrapped in an ES6 Promise.
 *
 * @param {String} url URL of the resource that is being requested.
 * @param {String} verb HTTP request verb (GET, POST, PUT , PATCH, DELETE)
 * @param {Object} options JSON Object with HTTP request options, "header"
 *     Object of possible headers to set, and a body Object of a POST body.
 *
 * @return {Promise} Resolves a parsed JSON Object or String response text if
 *     the response code is in the 200 range. Rejects with responce status text
 *     when the response code is outside of the 200 range.
 */
function ajax(url, verb = 'GET', options) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(verb, url);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

    for (let header in options.headers) {
      if ({}.hasOwnProperty.call(options.headers, header)) {
        xhr.setRequestHeader(header, options.headers[header]);
      }
    }

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300 ) {
        let response;

        try {
          response = JSON.parse(xhr.response);
        } catch (e) {
          response = xhr.response;
        }

        resolve(response);
      } else {
        reject(xhr.statusText);
      }
    };

    xhr.send(JSON.stringify(options.body));
  });
}

function generateName() {
  // Colors and Animals for randomly generated names
  var colors = ['amaranth', 'amber', 'amethyst', 'apricot', 'aquamarine', 'azure', 'beige', 'black', 'blue', 'blush', 'bronze', 'brown', 'burgundy', 'cerulean', 'champagne', 'chartreuse', 'chocolate', 'cobalt', 'coffee', 'copper', 'coral', 'crimson', 'cyan', 'desert', 'electric', 'emerald', 'erin', 'gold', 'gray', 'green', 'harlequin', 'indigo', 'ivory', 'jade', 'jungle', 'lavender', 'lemon', 'lilac', 'lime', 'magenta', 'maroon', 'mauve', 'navy', 'ocher', 'olive', 'orange', 'orchid', 'peach', 'pear', 'periwinkle', 'pink', 'plum', 'purple', 'raspberry', 'red', 'rose', 'ruby', 'salmon', 'sangria', 'sapphire', 'scarlet', 'silver', 'slate', 'tan', 'taupe', 'teal', 'turquoise', 'violet', 'viridian', 'white', 'yellow'];
  var animals = ['alligator', 'bear', 'cat', 'chinchilla', 'cow', 'coyote', 'crocodile', 'dolphin', 'duck', 'fish', 'fox', 'gecko', 'hamster', 'hippopotamus', 'jaguar', 'leopard', 'liger', 'lion', 'lynx', 'monkey', 'ocelot', 'octopus', 'panther', 'penguin', 'pig', 'rhinoceros', 'seal', 'skunk', 'sloth', 'starfish', 'stingray', 'tiger', 'tortoise', 'toucan', 'turtle', 'whale', 'wolf'];

  var color = colors[Math.floor(Math.random() * colors.length)];
  var animal = animals[Math.floor(Math.random() * animals.length)];

  return color + '-' + animal;
}

export default {
  newChatEngineChat,
  newUuid,
  ajax,
  generateName,
};
