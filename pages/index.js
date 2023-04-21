import React, { useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
// Material UI Elements
import MenuItem from "@material-ui/core/MenuItem";
import Button from "@material-ui/core/Button";
import Menu from "@material-ui/core/Menu";
// AWS Elements
import { withAuthenticator } from "@aws-amplify/ui-react";
import { API, Auth, withSSRContext, graphqlOperation } from "aws-amplify";
import { listMessages } from "../graphql/queries";
import { createMessage } from "../graphql/mutations";
import Message from "../components/message";
import { onCreateMessage } from "../graphql/subscriptions";

function Home({ messages }) {
  const [stateMessages, setStateMessages] = useState([...messages]);
  const [messageText, setMessageText] = useState("");
  const [user, setUser] = useState(null);
  // profile menu variables
  const [anchorEl, setAnchorEl] = React.useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const amplifyUser = await Auth.currentAuthenticatedUser();
        setUser(amplifyUser);
      } catch (err) {
        setUser(null);
      }
    };

    fetchUser();

    // Subscribe to creation of message
    const subscription = API.graphql(
      graphqlOperation(onCreateMessage)
    ).subscribe({
      next: ({ provider, value }) => {
        setStateMessages((stateMessages) => [
          ...stateMessages,
          value.data.onCreateMessage,
        ]);
      },
      error: (error) => console.warn(error),
    });
  }, []);

  useEffect(() => {
    async function getMessages() {
      try {
        const messagesReq = await API.graphql({
          query: listMessages,
          authMode: "AMAZON_COGNITO_USER_POOLS",
        });
        setStateMessages([...messagesReq.data.listMessages.items]);
      } catch (error) {
        console.error(error);
      }
    }
    getMessages();
  }, [user]);

  const handleSubmit = async (event) => {
    // Prevent the page from reloading
    event.preventDefault();

    // clear the textbox
    setMessageText("");

    const input = {
      // id is auto populated by AWS Amplify
      message: messageText, // the message content the user submitted (from state)
      owner: user.username, // this is the username of the current user
    };

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

  // Profile Menu Functions
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleDeleteAccount = () => {
    // blank slate
    if (user !== null) {
      // delete account here
      handleClose();
    }
  };
  const handleLogOut = () => {
    return new Promise((success) => {
      if (user !== null) {
        user.signOut();
        handleClose();
        window.location.reload();
      }
      success();
    });
  };
  const showProfileMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  if (user) {
    return (
      <div className={styles.background}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Welcome, {user.username}</h1>
            <label htmlFor="icon-button-user-profile">
              {/* Profile Menu */}
              <button
                className={styles.buttonUserProfile}
                onClick={showProfileMenu}
                color="primary" 
                aria-label="user profile" 
                aria-controls="simple-menu"
                aria-haspopup="true"
              >
                {user.username}
              </button>
              <Menu
                keepMounted
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                onClose={handleClose}
                open={Boolean(anchorEl)}
              >
                <MenuItem onClick={handleDeleteAccount}>Delete Account</MenuItem>
                <MenuItem onClick={handleLogOut}>Logout</MenuItem>
              </Menu>
            </label>
          </div>
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
                accept="image/*" 
                src="src/assets/round_add_a_photo_black_48dp.png"
                id="icon-button-file"
                type="file" 
                style={{ display: 'none' }}/>
              <label htmlFor="icon-button-file">
                <button
                  className={styles.buttonImage}
                  color="primary" 
                  aria-label="upload picture" 
                  component="span">
                </button>
              </label>
              <input
                type="text"
                id="message"
                name="message"
                autoFocus
                required
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Send a message to the chat"
                className={styles.textBox}
              />
              <button className={styles.buttonSend} style={{ marginLeft: "8px" }}>Send</button>
            </form>
          </div>
        </div>
      </div>
    );
  } else {
    return <p>Loading...</p>;
  }
}

export default withAuthenticator(Home);

export async function getServerSideProps({ req }) {
  // wrap the request in a withSSRContext to use Amplify functionality serverside.
  const SSR = withSSRContext({ req });

  try {
    // currentAuthenticatedUser() will throw an error if the user is not signed in.
    const user = await SSR.Auth.currentAuthenticatedUser();

    // If we make it passed the above line, that means the user is signed in.
    const response = await SSR.API.graphql({
      query: listMessages,
      // use authMode: AMAZON_COGNITO_USER_POOLS to make a request on the current user's behalf
      authMode: "AMAZON_COGNITO_USER_POOLS",
    });

    // return all the messages from the dynamoDB
    return {
      props: {
        messages: response.data.listMessages.items,
      },
    };
  } catch (error) {
    // We will end up here if there is no user signed in.
    // We'll just return a list of empty messages.
    return {
      props: {
        messages: [],
      },
    };
  }
}
