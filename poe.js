const axios = require('axios');
const regex = require('regex');

class PoeApi {
    BASE_URL = 'https://www.quora.com';

    FORMKEY_PATTERN = /formkey": "(.*?)"/;
    GRAPHQL_QUERIES = {
        'ChatFragment': `
      fragment ChatFragment on Chat {
        __typename
        id
        chatId
        defaultBotNickname
        shouldShowDisclaimer
      }
    `,
        'MessageFragment': `
      fragment MessageFragment on Message {
        id
        __typename
        messageId
        text
        linkifiedText
        authorNickname
        state
        vote
        voteReason
        creationTime
        suggestedReplies
      }
    `,
    };
    client;
    constructor(headers) {

        this.client = axios.create({
            headers: headers
        });

    }

    getFormkey() {
        return this.client.get(this.BASE_URL)
            .then((response) => {
                const regex = new RegExp(this.FORMKEY_PATTERN);
                const match = response.data.match(regex);

                return match && match[1];
            })
            .catch((error) => {
                console.log(error.message);
                throw error;
            });
    }

    async sendRequest(path, data) {
        try {
            const response = await this.client.post(`${this.BASE_URL}/poe_api/${path}`, data);

            return response.data;
        } catch (e) {
            console.log(e.message);

        }
    }
    async sendRequestGetCookie(path, data) {
        try {
            const response = await this.client.post(`${this.BASE_URL}/poe_api/${path}`, data);

            return response;
        } catch (e) {
            console.log(e.message);

        }
    }
    async getChatId(bot = 'a2') {
        const query = `
      query ChatViewQuery($bot: String!) {
        chatOfBot(bot: $bot) {
          __typename
          ...ChatFragment
        }
      }
      ${this.GRAPHQL_QUERIES['ChatFragment']}
    `;

        const variables = { bot };
        const data = { operationName: 'ChatViewQuery', query, variables };

        const responseJson = await this.sendRequestGetCookie('gql_POST', data);

        const chatData = responseJson.data.data;
        if (!chatData) {
            throw new Error('Chat data not found!');
        }
        return {
            chatID: chatData.chatOfBot.chatId,
            cookies: responseJson.headers["set-cookie"]
        };
    }
    async sendMessage(message, bot = 'a2', chatId = '') {
        const query = ` mutation AddHumanMessageMutation($chatId: BigInt!, $bot: String!, $query: String!, $source: MessageSource, $withChatBreak: Boolean! = false) {
                    messageCreate(
                        chatId: $chatId
                        bot: $bot
                        query: $query
                        source: $source
                        withChatBreak: $withChatBreak
                    ) {
                        __typename
                        message {
                        __typename
                        ...MessageFragment
                        chat {
                            __typename
                            id
                            shouldShowDisclaimer
                        }
                        }
                        chatBreak {
                        __typename
                        ...MessageFragment
                        }
                    }
                    }
                    ${this.GRAPHQL_QUERIES['MessageFragment']}
                `;

        const variables = { bot, chatId, query: message, source: null, withChatBreak: false };
        const data = { operationName: 'AddHumanMessageMutation', query, variables };
        return await this.sendRequest('gql_POST', data);
    }

    async clearContext(chatId) {
        const query = `
    mutation AddMessageBreakMutation($chatId: BigInt!) {
      messageBreakCreate(chatId: $chatId) {
        __typename
        message {
          __typename
          ...MessageFragment
        }
      }
    }
    ${GRAPHQL_QUERIES['MessageFragment']}
  `;

        const variables = { chatId };
        const data = { operationName: 'AddMessageBreakMutation', query, variables };
        await sendRequest('gql_POST', data);
    }

    async getLatestMessage(bot) {
        const query = `
    query ChatPaginationQuery($bot: String!, $before: String, $last: Int! = 10) {
      chatOfBot(bot: $bot) {
        id
        __typename
        messagesConnection(before: $before, last: $last) {
          __typename
          pageInfo {
            __typename
            hasPreviousPage
          }
          edges {
            __typename
            node {
              __typename
              ...MessageFragment
            }
          }
        }
      }
    }
    ${GRAPHQL_QUERIES['MessageFragment']}
  `;

        const variables = { before: null, bot, last: 1 };
        const data = { operationName: 'ChatPaginationQuery', query, variables };

        let authorNickname = '';
        let state = 'incomplete';
        while (true) {
            await sleep(2000);
            const responseJson = await sendRequest('gql_POST', data);
            const edges = responseJson.data.chatOfBot.messagesConnection.edges;
            if (edges.length > 0) {
                const latestMessage = edges[edges.length - 1].node;
                const text = latestMessage.text;
                state = latestMessage.state;
                authorNickname = latestMessage.authorNickname;
                if (authorNickname === bot && state === 'complete') {
                    return text;
                }
            } else {
                return 'Fail to get a message. Please try again!';
            }
        }
    }
}


module.exports = PoeApi;