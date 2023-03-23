import React, { useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
import { withAuthenticator } from "@aws-amplify/ui-react";
import { listMessages } from "../../graphql/queries"
import { createMessage } from "../../graphql/mutations";
import { onCreateMessage } from "../../graphql/subscriptions";

function Home() {

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log(event.target[0].value);
  };

  return (
    <div className={styles.background}>
      <div className={styles.container}>
        <h1 className={styles.title}> AWS Amplify Live Chat</h1>

        <div className={styles.chatbox}>
          <div className={styles.formContainer}>
            <form onSubmit={handleSubmit} className={styles.formBase}>
              <input
                type="text"
                id="message"
                name="message"
                autoFocus
                required
                placeholder="💬 Send a message to the world 🌎"
                className={styles.textBox}
              />
              <button style={{ marginLeft: "8px" }}>Send</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuthenticator(Home);
