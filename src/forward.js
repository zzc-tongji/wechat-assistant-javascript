const { log } = require('wechaty');

const rejectLogger = (error) => {
  log.error('wechaty::message', '%s', error.toString());
};

module.exports = (message, user, robot) => {
  // forward message with information
  return new Promise((resolve) => {
    const messageType = message.type();
    const resolveLogger = () => {
      if (messageType == robot.Message.Type.Text) {
        log.info('wechaty::message', 'forward - %s - %s', message.from().name(), message.text());
      } else {
        log.info('wechaty::message', 'forward - %s', message.from().name());
      }
      resolve();
    };
    const room = message.room();
    if (room != null) {
      // room message
      room.topic().then((topic) => {
        user.say(`群聊：${topic}\n\n发送者：${message.from().name()}\n\n时间：${message.date().toString()}`).then(() => {
          message.forward(user).then(resolveLogger).catch(rejectLogger);
        }).catch(rejectLogger);
      }).catch(rejectLogger);
    } else {
      // personal message || official message
      user.say(`发送者：${message.from().name()}\n\n时间：${message.date().toString()}`).then(() => {
        message.forward(user).then(resolveLogger).catch(rejectLogger);
      }).catch(rejectLogger);
    }
  });
};
