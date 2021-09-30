import React, { useEffect, useState } from "react";
import styles from "./styles/Home.module.css";
import { API, Auth, graphqlOperation } from "aws-amplify";
import { withAuthenticator, AmplifySignOut } from "@aws-amplify/ui-react";

import Message from "./components/message";
import { listMessages } from "./graphql/queries";
import { createMessage } from "./graphql/mutations";
import { onCreateMessage } from "./graphql/subscriptions";

function Chat() {
  const [stateMessages, setStateMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [user, setUser] = useState(null);

  //Fetch All Messages

  useEffect(() => {
    async function fetchMessages() {
      try {
        // currentAuthenticatedUser() will throw an error if the user is not signed in.
        // const user = await Auth.currentAuthenticatedUser();
        await Auth.currentAuthenticatedUser();

        // If we make it passed the above line, that means the user is signed in.
        const response = await API.graphql({
          query: listMessages,
          // use authMode: AMAZON_COGNITO_USER_POOLS to make a request on the current user's behalf
          authMode: "AMAZON_COGNITO_USER_POOLS",
        });

        // return all the messages from the dynamoDB
        setStateMessages(response.data.listMessages.items);
      } catch (error) {
        // We will end up here if there is no user signed in.
        // We'll just return a list of empty messages.
        console.log("Error fetching messages", error);
      }
    }
    fetchMessages();
    // }, []);
  }, [user]);

  //Fetch Current Authenticated User
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const amplifyUser = await Auth.currentAuthenticatedUser();
        setUser(amplifyUser);
      } catch (err) {
        setUser(null);
        console.log("No aunthenticated user found", err);
      }
    };

    fetchUser();

    // Subscribe to creation of message
    // const subscription = API.graphql(
    API.graphql(graphqlOperation(onCreateMessage)).subscribe({
      next: ({ provider, value }) => {
        setStateMessages((stateMessages) => [
          ...stateMessages,
          value.data.onCreateMessage,
        ]);
      },
      error: (error) => console.warn(error),
    });
  }, []);

  const handleSubmit = async (event) => {
    // Prevent the page from reloading
    event.preventDefault();

    const input = {
      // id is auto populated by AWS Amplify
      message: messageText, // the message content the user submitted (from state)
      owner: user.username, // this is the username of the current user
    };

    // clear the textbox
    setMessageText("");

    // Try make the mutation to graphql API
    try {
      await API.graphql({
        authMode: "AMAZON_COGNITO_USER_POOLS",
        query: createMessage,
        variables: {
          input: input,
        },
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (user) {
    return (
      <div className={styles.background}>
        <div className={styles.container}>
          <AmplifySignOut />
          <h1 className={styles.title}> AWS Amplify Live Chat</h1>
          <div className={styles.chatbox}>
            {stateMessages
              // sort messages oldest to newest client-side
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((message) => (
                // map each message into the message component with message as props
                <Message
                  message={message}
                  user={user}
                  isMe={user.username === message.owner}
                  key={message.id}
                />
              ))}
          </div>
          <div className={styles.formContainer}>
            <form onSubmit={handleSubmit} className={styles.formBase}>
              <input
                type="text"
                id="message"
                name="message"
                autoFocus
                required
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="💬 Send a message to the world 🌎"
                className={styles.textBox}
              />
              <button style={{ marginLeft: "8px" }}>Send</button>
            </form>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <p>Loading...</p>;
    </div>
  );
}

// export default Chat;
export default withAuthenticator(Chat);
