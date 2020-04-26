/* eslint-disable no-unused-vars */

const { log } = require('wechaty');
const forward = require('../src/forward');

const searchTextMessage = (message, reg) => {
  return message.text().search(reg) === -1 ? false : true;
};

const personalMessageHandler = (message, user, robot) => {
  // friend message
  //
  // TODO: add or modify rulers at here.
  //
  if (message.from() === user) {
    // the usage of function `forward`
    forward(message, user, robot);
  }
};

const roomMessageHandler = (message, user, robot) => {
  // group message
  //
  // TODO: add or modify rulers at here.
  //
  message.mentionSelf().then((isMentioned) => {
    if (isMentioned) {
      // forward all messages which mention me
      forward(message, user, robot);
      return;
    }
    switch (message.type()) {
      case robot.Message.Type.Attachment:
        break;
      case robot.Message.Type.Audio:
        break;
      case robot.Message.Type.Contact:
        break;
      case robot.Message.Type.Emoticon:
        break;
      case robot.Message.Type.Image:
        break;
      case robot.Message.Type.Text:
        if (
          // the usage of function `searchTextMessage`
          searchTextMessage(message, /test/) ||
          searchTextMessage(message, /测试/)
        ) {
          forward(message, user, robot);
        }
        break;
      case robot.Message.Type.Video:
        break;
      case robot.Message.Type.Url:
        break;
      default: // robot.Message.Type.Unknown
        break;
    }
  }).catch((error) => {
    log.error('wechaty::message', '%s', error.toString());
  });
};

const officialMessageHandler = (message, user, robot) => {
  // official account message
  //
  // TODO: add or modify rulers at here.
  //
};

module.exports = (message, user, robot) => {
  // exclude message sent by self
  if (message.self()) {
    return;
  }
  // handle
  if (message.room() != null) {
    roomMessageHandler(message, user, robot);
  } else if (message.from().type() == robot.Contact.Type.Personal) {
    personalMessageHandler(message, user, robot);
  } else if (message.from().type() == robot.Contact.Type.Official) {
    officialMessageHandler(message, user, robot);
  }
};
