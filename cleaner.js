import fs from 'fs';
import fetch from 'node-fetch';
import readline from 'readline';

const userid = '1150858705823334431';// ur userid
const data = fs.readFileSync('data.txt', 'utf-8').split('\n');
const authToken = data[1].trim(); // Discord token
const channel = data[2].trim(); // Channel ID

const lastmsg = '1286075223828992164'; // last message you sent

const delay = 4 * 1000; // 4sec delay to prevent Ratelimits

let deletedMessagesCount = 0;
function incrementCounter() {
  deletedMessagesCount++;
  return deletedMessagesCount;
}

function logMessage(message) {
  const timestamp = new Date().toLocaleString();
  const log = `[${timestamp}] ${message}\n`;
  fs.appendFileSync('log.txt', log, 'utf-8');
  console.log(log.trim());
}

async function promptUserConfirmation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Are you sure you want to start deleting your messages? This action cannot be undone! Type "yes" if you wish to continue or you can enter any other key to cancel: ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function getChannelName() {
  const baseURL = `https://discord.com/api/v10/channels/${channel}`;
  const headers = { "Authorization": authToken };

  try {
    const response = await fetch(baseURL, { headers, method: 'GET' });
    if (response.ok) {
      const channelData = await response.json();
      return channelData.name;
    } else {
      throw new Error('Failed to fetch channel data');
    }
  } catch (error) {
    logMessage(`Error fetching channel name: ${error.message}`);
    return null;
  }
}

async function clearMessages(beforeMessageId = lastmsg) {
  const baseURL = `https://discord.com/api/v10/channels/${channel}/messages`;
  const headers = { "Authorization": authToken };

  try {
    const url = beforeMessageId
      ? `${baseURL}?before=${beforeMessageId}`
      : baseURL;

    const response = await fetch(url, { headers, method: 'GET' });
    const messages = await response.json();

    if (response.status === 404 || messages.code === 10003) {
      logMessage("Error: Unknown channel. Please double-check the channel ID you entered and try again.");
      return;
    }

    if (!Array.isArray(messages)) {
      logMessage("Error: Failed to fetch messages from the Discord API. This may be due to network issues. Try again later.");
      return;
    }

    if (messages.length === 0) {
      logMessage("No more messages to delete, stopping execution.");
      return;
    }

    if (deletedMessagesCount === 0) {
      const userConfirmation = await promptUserConfirmation();
      if (!userConfirmation) {
        logMessage("User cancelled the operation. No messages will be deleted.");
        return;
      }
    }

    const channelName = await getChannelName();
    if (!channelName) {
      logMessage("Error: Could not retrieve channel name. Messages will be deleted without channel name information.");
    } else {
      logMessage(`Starting message deletion in channel: ${channelName}`);
    }

    for (const message of messages) {
      if (message.author.id === userid) {
        const count = incrementCounter();

        await new Promise(resolve => setTimeout(resolve, delay));
        await fetch(`${baseURL}/${message.id}`, { headers, method: 'DELETE' });

        logMessage(`Deleted message ${count} with ID: ${message.id} - Content: ${message.content}`);
      }
    }

    clearMessages(messages[messages.length - 1].id);

  } catch (error) {
    logMessage(`Error: An error occurred while fetching messages from the Discord API. This may be due to network issues, try again later. Error message: ${error.message}`);
  }
}

clearMessages();
